import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { $ } from "bun";
import {
	configPath,
	effectiveConfig,
	policyApplies,
	readFileConfig,
} from "./config";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";
import {
	domainError,
	isJsonMode,
	operationalError,
	ProtocolError,
	usageError,
} from "./protocol";
import {
	ASSIGNMENTS_PATH,
	commitWithRollback,
	extractSection,
	FLOW_PATH,
	findIssueFile,
	findIssueFiles,
	gitAdd,
	gitAddUpdate,
	gitCommit,
	readAssignments,
	readFlow,
	readIssue,
	relPath,
	replaceSection,
	scopeFromPath,
	slugFromTitle,
	today,
	walkIssues,
	writeAssignments,
	writeFlow,
	writeIssue,
} from "./repository";
import { ROOT } from "./runtime";
import { appendCommit, appendHistoryEvent, parseTaskLog } from "./task-log";
import type { Assignment, IssueFrontmatter } from "./types";

// ── Utilities ─────────────────────────────────────────────────────────────────

export function die(msg: string): never {
	if (msg.startsWith("Usage:")) usageError(msg);
	if (msg.includes("already claimed")) domainError(msg, "TASK_ALREADY_CLAIMED");
	if (msg.startsWith("Issue not found")) domainError(msg, "TASK_NOT_FOUND");
	if (msg.startsWith("No active assignment"))
		domainError(msg, "NO_ACTIVE_ASSIGNMENT");
	if (msg.includes("cannot be claimed")) domainError(msg, "TASK_NOT_CLAIMABLE");
	if (msg.startsWith("Triage status")) domainError(msg, "INVALID_STATUS");
	if (msg.startsWith("Template not found"))
		domainError(msg, "TEMPLATE_NOT_FOUND");
	if (msg.startsWith("Cannot close") || msg.startsWith("Completion "))
		domainError(msg, "COMPLETION_BLOCKED");
	if (msg.startsWith("Unknown backend") || msg.includes("ANTHROPIC_API_KEY"))
		operationalError(msg, "BACKEND_UNAVAILABLE");
	if (msg.startsWith("Failed to parse AI response"))
		operationalError(msg, "INVALID_BACKEND_RESPONSE");
	domainError(msg);
}

export function parseFlags(args: string[]): Record<string, string> {
	const flags: Record<string, string> = {};
	for (let i = 0; i < args.length; i++) {
		if (args[i].startsWith("--")) {
			const key = args[i].slice(2);
			if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
				flags[key] = args[i + 1];
				i++;
			} else {
				flags[key] = "true";
			}
		}
	}
	return flags;
}

export async function cmdConfig(args: string[]) {
	const subcommand = args[0];
	if (subcommand === "path") {
		console.log(configPath());
		return { path: configPath() };
	}
	if (subcommand === "validate") {
		readFileConfig();
		console.log(`Valid configuration: ${configPath()}`);
		return { valid: true, path: configPath() };
	}
	if (subcommand !== undefined) die("Usage: task config [path|validate]");
	const config = effectiveConfig();
	console.log(JSON.stringify(config, null, 2));
	return { config };
}

export function parseTemplateArg(args: string[]): {
	templateName: string;
	positional: string[];
} {
	const positional: string[] = [];
	let templateName = "issue";

	for (let i = 0; i < args.length; i++) {
		if (args[i] !== "--template") {
			positional.push(args[i]);
			continue;
		}

		if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
			die("Usage: --template <name>");
		}

		templateName = args[i + 1];
		i++;
	}

	return { templateName, positional };
}

export function resolveIssueTemplate(templateName: string): string {
	const templatePath = join(ROOT, "issues", "templates", `${templateName}.md`);
	if (!existsSync(templatePath)) {
		die(`Template not found: ${relPath(templatePath)}`);
	}

	return readFileSync(templatePath, "utf-8");
}

export async function prompt(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

// ── task lint ─────────────────────────────────────────────────────────────────

export async function cmdLint() {
	let errors = 0;
	let warnings = 0;

	const err = (msg: string) => {
		process.stderr.write(`ERROR: ${msg}\n`);
		errors++;
	};
	const warn = (msg: string) => {
		process.stderr.write(`WARNING: ${msg}\n`);
		warnings++;
	};
	const ok = (msg: string) => console.log(`OK: ${msg}`);

	// flow.md sections and order
	if (!existsSync(FLOW_PATH)) {
		err("flow.md missing");
	} else {
		const flow = readFlow();
		const lines = flow.split("\n");
		const SECTIONS = [
			"## Today",
			"### Planned",
			"### Active",
			"### Completed",
			"### Deferred",
			"## Agent Queue",
			"## Issue Scratchpad",
			"## Meeting Notes",
			"## Notes",
		];
		const indices = SECTIONS.map((s) => lines.indexOf(s));

		for (let i = 0; i < SECTIONS.length; i++) {
			if (indices[i] === -1) err(`Missing section: ${SECTIONS[i]}`);
		}

		if (indices.every((i) => i !== -1)) {
			let ordered = true;
			for (let i = 1; i < indices.length; i++) {
				if (indices[i] <= indices[i - 1]) {
					ordered = false;
					break;
				}
			}
			if (ordered) ok("flow.md section order is valid");
			else err("flow.md sections are out of order");
		}

		// Task lines need IDs
		const taskLines = lines.filter((l) => /^- \[[ x\-*]\]/.test(l));
		for (const l of taskLines) {
			if (!/\(id:[a-z0-9][a-z0-9-]*\)/.test(l)) {
				warn(`Task line missing (id:<slug>): ${l}`);
			}
		}

		// Active section size
		const activeSection = extractSection(flow, "### Active");
		const activeCount = (activeSection.match(/^- \[/gm) ?? []).length;
		if (activeCount > 5)
			warn(`Today/Active has ${activeCount} items (recommended ≤ 5)`);
		else ok(`Today/Active size OK (${activeCount} items)`);
	}

	// Issue frontmatter
	const VALID_STATUSES = new Set([
		"open",
		"in-progress",
		"done",
		"blocked",
		"needs-triage",
		"needs-info",
		"ready-for-agent",
		"ready-for-human",
		"wontfix",
	]);
	const VALID_PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);

	for (const filePath of walkIssues()) {
		const rel = relPath(filePath);
		let data: IssueFrontmatter;
		try {
			({ data } = readIssue(filePath));
		} catch (e) {
			err(`${rel}: failed to parse — ${e}`);
			continue;
		}

		for (const f of ["id", "status", "priority", "created_at"] as const) {
			if (!data[f]) err(`${rel}: missing required field '${f}'`);
		}
		if (data.status && !VALID_STATUSES.has(data.status))
			err(`${rel}: invalid status '${data.status}'`);
		if (data.priority && !VALID_PRIORITIES.has(data.priority))
			warn(`${rel}: invalid priority '${data.priority}'`);
		for (const message of parseTaskLog(readIssue(filePath).body).errors) {
			err(`${rel}: ${message}`);
		}

		const slug = basename(filePath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
		if (data.id && data.id !== slug)
			err(`${rel}: id '${data.id}' does not match filename slug '${slug}'`);
	}

	// assignments.yaml
	if (!existsSync(ASSIGNMENTS_PATH)) {
		warn("assignments.yaml not found");
	} else {
		const assignments = readAssignments();
		const activeCounts = new Map<string, number>();
		for (const a of assignments) {
			if (a.status === "active")
				activeCounts.set(a.task_id, (activeCounts.get(a.task_id) ?? 0) + 1);
		}
		for (const [id, count] of activeCounts) {
			if (count > 1)
				err(
					`assignments.yaml: ${count} active records for task_id '${id}' (must be unique)`,
				);
		}
		for (const a of assignments.filter(
			(a) => a.status === "active" && a.owner_type === "agent",
		)) {
			if (!a.lease_until)
				err(
					`assignments.yaml: agent assignment for '${a.task_id}' missing lease_until`,
				);
		}
		ok("assignments.yaml validated");
	}

	console.log("");
	if (errors === 0 && warnings === 0) {
		console.log("All checks passed.");
	} else if (errors === 0) {
		console.log(`Completed with ${warnings} warning(s).`);
	} else {
		throw new ProtocolError(
			"VALIDATION_FAILED",
			`Failed: ${errors} error(s), ${warnings} warning(s).`,
			"domain",
			{ errors, warnings },
		);
	}
	return { errors, warnings };
}

// ── task new ──────────────────────────────────────────────────────────────────

export async function cmdNew(args: string[]) {
	const { templateName, positional } = parseTemplateArg(args);
	const scope = positional[0];
	const titleParts = positional.slice(1);
	if (!scope || titleParts.length === 0)
		die("Usage: task new <scope> <title> [--template <name>]");

	const title = titleParts.join(" ");
	const slug = slugFromTitle(title);
	const scopeDir = join(ROOT, "issues", scope);
	if (!existsSync(scopeDir)) mkdirSync(scopeDir, { recursive: true });

	const filePath = join(scopeDir, `${slug}.md`);
	if (existsSync(filePath)) die(`Already exists: ${relPath(filePath)}`);

	const templateContent = resolveIssueTemplate(templateName);
	const { body: templateBody } = parseFrontmatter(templateContent);

	const fm: Record<string, unknown> = {
		id: slug,
		title,
		status: "needs-triage",
		priority: "P2",
		owner: "human",
		owner_type: "human",
		agent_id: null,
		tags: [scope],
		created_at: today(),
		closed_at: null,
	};

	writeFileSync(filePath, `${serializeFrontmatter(fm)}\n${templateBody}`);
	console.log(relPath(filePath));
	return { task: fm, path: relPath(filePath) };
}

// ── task claim ────────────────────────────────────────────────────────────────

export async function cmdClaim(args: string[]) {
	const taskId = args[0];
	if (!taskId)
		die(
			"Usage: task claim <task-id> [--owner <name>] [--agent <id>] [--worktree <path>] [--branch <branch>] [--lease <minutes>]",
		);

	const flags = parseFlags(args.slice(1));
	const agentId = flags.agent ?? null;
	const owner = flags.owner ?? (agentId ? agentId : "human");
	const worktree = flags.worktree ?? null;
	const branch = flags.branch ?? null;
	const leaseMinutes = flags.lease ? parseInt(flags.lease, 10) : null;
	const ownerType: "human" | "agent" = agentId ? "agent" : "human";

	if (ownerType === "agent" && !leaseMinutes)
		die("Agent claims require --lease <minutes>");

	const assignments = readAssignments();
	const conflict = assignments.find(
		(a) => a.task_id === taskId && a.status === "active",
	);
	if (conflict) die(`Task '${taskId}' already claimed by '${conflict.owner}'`);

	const leaseUntil = leaseMinutes
		? new Date(Date.now() + leaseMinutes * 60_000).toISOString()
		: null;

	const record: Assignment = {
		task_id: taskId,
		status: "active",
		owner,
		owner_type: ownerType,
		agent_id: agentId,
		worktree,
		branch,
		claimed_at: new Date().toISOString(),
		lease_until: leaseUntil,
		released_at: null,
	};

	const issuePath = findIssueFile(taskId);
	if (issuePath) {
		const { data } = readIssue(issuePath);
		const claimableStatuses = new Set([
			"open",
			"ready-for-agent",
			"ready-for-human",
		]);
		if (!claimableStatuses.has(data.status)) {
			die(
				`Task '${taskId}' has status '${data.status}' and cannot be claimed. Claimable statuses: open, ready-for-agent, ready-for-human`,
			);
		}
	}
	const changedFiles: string[] = [ASSIGNMENTS_PATH];
	if (issuePath) changedFiles.push(issuePath);
	changedFiles.push(FLOW_PATH);

	await commitWithRollback(
		`claim(${taskId}): ${owner}`,
		changedFiles,
		async () => {
			assignments.push(record);
			writeAssignments(assignments);

			if (issuePath) {
				const { data, body } = readIssue(issuePath);
				data.status = "in-progress";
				data.owner = owner;
				data.owner_type = ownerType;
				data.agent_id = agentId;
				writeIssue(
					issuePath,
					data,
					appendHistoryEvent(body, {
						id: `claim-${record.claimed_at}`,
						text: `- ${record.claimed_at} — ${owner} claimed task`,
					}),
				);
			}

			await cmdRender();
			await gitAdd(changedFiles);
		},
	);
	console.log(`Claimed '${taskId}' by '${owner}'`);
	return { task_id: taskId, assignment: record };
}

// ── task triage ───────────────────────────────────────────────────────────────

export async function cmdTriage(args: string[]) {
	const taskId = args[0];
	const newStatus = args[1];
	if (!taskId || !newStatus) die("Usage: task triage <task-id> <new-status>");

	const triageStatuses = new Set([
		"needs-triage",
		"needs-info",
		"ready-for-agent",
		"ready-for-human",
		"wontfix",
	]);
	if (!triageStatuses.has(newStatus)) {
		die(
			"Triage status must be one of: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix",
		);
	}

	const issuePath = findIssueFile(taskId);
	if (!issuePath) die(`Issue not found for '${taskId}'`);

	const { data, body } = readIssue(issuePath);
	const previousStatus = data.status;
	data.status = newStatus as IssueFrontmatter["status"];

	await commitWithRollback(
		`triage(${taskId}): ${previousStatus} -> ${newStatus}`,
		[issuePath],
		async () => {
			writeIssue(issuePath, data, body);
			await gitAdd([issuePath]);
		},
	);
	console.log(`Triaged '${taskId}' -> '${newStatus}'`);
	return {
		task_id: taskId,
		previous_status: previousStatus,
		status: newStatus,
	};
}

// ── task release ──────────────────────────────────────────────────────────────

export async function cmdRelease(args: string[]) {
	const taskId = args[0];
	if (!taskId) die("Usage: task release <task-id> [--reason <note>]");

	const assignments = readAssignments();
	const idx = assignments.findIndex(
		(a) => a.task_id === taskId && a.status === "active",
	);
	if (idx === -1) die(`No active assignment for '${taskId}'`);

	const issuePath = findIssueFile(taskId);
	const changedFiles: string[] = [ASSIGNMENTS_PATH];
	if (issuePath) changedFiles.push(issuePath);
	changedFiles.push(FLOW_PATH);

	await commitWithRollback(`release(${taskId})`, changedFiles, async () => {
		assignments[idx].status = "released";
		assignments[idx].released_at = new Date().toISOString();
		writeAssignments(assignments);

		if (issuePath) {
			const { data, body } = readIssue(issuePath);
			data.status = "open";
			data.owner = "human";
			data.owner_type = "human";
			data.agent_id = null;
			writeIssue(
				issuePath,
				data,
				appendHistoryEvent(body, {
					id: `release-${assignments[idx].released_at}`,
					text: `- ${assignments[idx].released_at} — ${assignments[idx].owner} released task`,
				}),
			);
		}

		await cmdRender();
		await gitAdd(changedFiles);
	});
	console.log(`Released '${taskId}'`);
	return { task_id: taskId, assignment: assignments[idx] };
}

// ── task close ────────────────────────────────────────────────────────────────

function acceptanceFailures(body: string): string[] {
	const heading = /^## Acceptance Criteria\s*$/m.exec(body);
	if (!heading || heading.index === undefined)
		return [
			"Acceptance Criteria section is absent. Add checked criteria before closing.",
		];
	const afterHeading = body.slice(heading.index + heading[0].length);
	const nextHeading = /^##\s+/m.exec(afterHeading);
	const section =
		nextHeading?.index === undefined
			? afterHeading
			: afterHeading.slice(0, nextHeading.index);
	const checks = [...section.matchAll(/^\s*- \[([ xX])\]\s*(.+)$/gm)];
	if (checks.length === 0)
		return [
			"Acceptance Criteria contains no checkboxes. Add checked criteria before closing.",
		];
	return checks
		.filter((check) => check[1].toLowerCase() !== "x")
		.map((check) => `Acceptance criterion is unchecked: ${check[2]}`);
}

async function commitEvidence(
	taskId: string,
	assignment: Assignment | undefined,
	hashes: string[],
): Promise<{ hash: string; subject: string }[]> {
	if (!assignment?.worktree)
		throw new Error(
			`Related commits require an active assignment with --worktree. Re-claim ${taskId} with --worktree <application-repository>.`,
		);
	if (assignment.worktree === ROOT)
		throw new Error(
			"Related commits must come from the application worktree, not Docket's task worktree.",
		);
	const evidence: { hash: string; subject: string }[] = [];
	for (const value of hashes) {
		const hash = (
			await $`git -C ${assignment.worktree} rev-parse ${value}^{commit}`.text()
		).trim();
		if (!hash)
			throw new Error(
				`Commit '${value}' is not a commit in ${assignment.worktree}.`,
			);
		const subject = (
			await $`git -C ${assignment.worktree} show -s --format=%s ${hash}`.text()
		).trim();
		const message = (
			await $`git -C ${assignment.worktree} show -s --format=%B ${hash}`.text()
		).trim();
		if (/^(claim|triage|close)\(/.test(subject))
			throw new Error(
				`Commit '${hash}' is Docket state evidence, not an implementation commit.`,
			);
		if (!message.includes(taskId))
			throw new Error(
				`Commit '${hash}' is not associated with ${taskId}. Include the task ID in its commit message.`,
			);
		evidence.push({ hash, subject });
	}
	return evidence;
}

async function worktreeDirty(
	assignment: Assignment | undefined,
): Promise<boolean> {
	if (!assignment?.worktree)
		throw new Error(
			"Clean worktree enforcement requires an active assignment with --worktree.",
		);
	if (assignment.worktree === ROOT)
		throw new Error(
			"Clean worktree enforcement must target the application worktree, not Docket's task worktree.",
		);
	return Boolean(
		(await $`git -C ${assignment.worktree} status --porcelain`.text()).trim(),
	);
}

export async function cmdClose(args: string[]) {
	const taskId = args[0];
	const flags = parseFlags(args.slice(1));
	const wontfix = "wontfix" in flags;
	if (!taskId)
		die(
			"Usage: task close <task-id> [--wontfix] [--commit <hash>] [--force --reason <text>]",
		);

	const issuePath = findIssueFile(taskId);
	if (!issuePath) die(`Issue not found for '${taskId}'`);

	const scope = scopeFromPath(issuePath);
	const { data, body } = readIssue(issuePath);
	data.status = wontfix ? "wontfix" : "done";
	data.closed_at = today();

	const doneDir = join(ROOT, "issues", scope, "done");
	if (!existsSync(doneDir)) mkdirSync(doneDir, { recursive: true });

	const newPath = join(doneDir, `${today()}-${taskId}.md`);
	const assignments = readAssignments();
	const idx = assignments.findIndex(
		(a) => a.task_id === taskId && a.status === "active",
	);
	const assignment = idx === -1 ? undefined : assignments[idx];
	const config = effectiveConfig();
	const force = "force" in flags;
	const reason = flags.reason?.trim();
	if (
		(force ||
			(wontfix &&
				(policyApplies(config.completion.acceptanceCriteria, assignment) ||
					policyApplies(config.completion.relatedCommits, assignment) ||
					policyApplies(config.completion.cleanWorktree, assignment) ||
					policyApplies(
						config.completion.requireActiveAssignment,
						assignment,
					)))) &&
		!reason
	)
		die("Completion override requires --reason <text>.");
	if (force && !config.completion.allowOverride)
		die(
			"Completion overrides are disabled by docket.json (completion.allowOverride is false).",
		);
	if (!force && !wontfix) {
		const failures: string[] = [];
		if (
			policyApplies(config.completion.requireActiveAssignment, assignment) &&
			!assignment
		)
			failures.push(
				`No active assignment for '${taskId}'. Claim the task before closing.`,
			);
		if (policyApplies(config.completion.acceptanceCriteria, assignment))
			failures.push(...acceptanceFailures(body));
		const commitHashes = args
			.slice(1)
			.flatMap((arg, index, values) =>
				arg === "--commit" && values[index + 1] ? [values[index + 1]] : [],
			);
		let evidence: { hash: string; subject: string }[] = [];
		if (policyApplies(config.completion.relatedCommits, assignment)) {
			if (commitHashes.length === 0)
				failures.push(
					`Related commits are required. Re-run: task close ${taskId} --commit <hash>`,
				);
			else {
				try {
					evidence = await commitEvidence(taskId, assignment, commitHashes);
				} catch (error) {
					failures.push(error instanceof Error ? error.message : String(error));
				}
			}
		}
		if (policyApplies(config.completion.cleanWorktree, assignment)) {
			try {
				if (await worktreeDirty(assignment))
					failures.push(
						`Application worktree '${assignment?.worktree}' has uncommitted changes. Commit or stash them before closing.`,
					);
			} catch (error) {
				failures.push(error instanceof Error ? error.message : String(error));
			}
		}
		if (failures.length > 0)
			die(`Cannot close '${taskId}':\n- ${failures.join("\n- ")}`);
		// Keep only validated evidence; unguarded human closures retain legacy behavior.
		flags.__evidence = JSON.stringify(evidence);
	}

	await commitWithRollback(
		`close(${taskId})`,
		[issuePath, newPath, FLOW_PATH, ASSIGNMENTS_PATH],
		async () => {
			let updatedBody = body;
			for (const commit of JSON.parse(flags.__evidence ?? "[]") as {
				hash: string;
				subject: string;
			}[])
				updatedBody = appendCommit(updatedBody, commit);
			if (force && reason)
				updatedBody = appendHistoryEvent(updatedBody, {
					id: `override-${new Date().toISOString()}`,
					text: `- ${new Date().toISOString()} — completion override: ${reason}`,
				});
			if (wontfix && reason)
				updatedBody = appendHistoryEvent(updatedBody, {
					id: `wontfix-${new Date().toISOString()}`,
					text: `- ${new Date().toISOString()} — wontfix reason: ${reason}`,
				});
			writeIssue(
				issuePath,
				data,
				appendHistoryEvent(updatedBody, {
					id: `close-${data.closed_at}`,
					text: `- ${data.closed_at} — task closed by ${data.owner ?? "human"}`,
				}),
			);
			renameSync(issuePath, newPath);

			// Release any active assignment
			if (idx !== -1) {
				assignments[idx].status = "released";
				assignments[idx].released_at = new Date().toISOString();
				writeAssignments(assignments);
			}

			await cmdRender();

			// Stage the moved issue and any generated task files in the task worktree.
			await gitAdd([newPath, FLOW_PATH]);
			await gitAddUpdate([issuePath]);
			if (idx !== -1) await gitAdd([ASSIGNMENTS_PATH]);
		},
	);
	console.log(`Closed '${taskId}' → ${relPath(newPath)}`);
	return { task_id: taskId, status: data.status, path: relPath(newPath) };
}

// ── task doctor ───────────────────────────────────────────────────────────────

export async function cmdDoctor() {
	const assignments = readAssignments();
	const now = new Date();
	let mutated = false;
	const warnings: string[] = [];

	for (const a of assignments) {
		if (
			a.status === "active" &&
			a.lease_until &&
			new Date(a.lease_until) < now
		) {
			a.status = "expired";
			const message = `EXPIRED: ${a.task_id} (lease was ${a.lease_until})`;
			warnings.push(message);
			console.warn(message);
			mutated = true;
		}
	}

	if (mutated) {
		writeAssignments(assignments);
		await cmdRender();
	}

	const activeIds = new Set(
		assignments.filter((a) => a.status === "active").map((a) => a.task_id),
	);
	const issueFiles = walkIssues();

	// in-progress issues with no active assignment
	for (const p of issueFiles) {
		const { data } = readIssue(p);
		if (data.status === "in-progress" && !activeIds.has(data.id)) {
			const message = `WARN: ${relPath(p)} is in-progress but has no active assignment`;
			warnings.push(message);
			console.warn(message);
		}
		if (data.status === "needs-triage" && !data.owner) {
			const createdAt = new Date(String(data.created_at ?? ""));
			const ageDays = Number.isFinite(createdAt.getTime())
				? Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000)
				: NaN;
			if (Number.isFinite(ageDays) && ageDays > 7) {
				const message = `WARN: ${relPath(p)} is needs-triage for ${ageDays} days with no owner`;
				warnings.push(message);
				console.warn(message);
			}
		}
	}

	// active assignments pointing to non-existent issue files
	const issueSlugs = new Set(
		issueFiles.map((p) =>
			basename(p, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
		),
	);
	for (const a of assignments.filter((a) => a.status === "active")) {
		if (!issueSlugs.has(a.task_id)) {
			const message = `WARN: active assignment for '${a.task_id}' has no issue file`;
			warnings.push(message);
			console.warn(message);
		}
	}

	// flow.md Active entries not backed by active assignment
	const flow = readFlow();
	const activeSection = extractSection(flow, "### Active");
	for (const m of activeSection.matchAll(/\(id:([a-z0-9][a-z0-9-]*)\)/g)) {
		if (!activeIds.has(m[1])) {
			const message = `WARN: flow.md Active entry '${m[1]}' has no active assignment`;
			warnings.push(message);
			console.warn(message);
		}
	}

	console.log("Doctor check complete.");
	return { mutated, warnings };
}

// ── task render ───────────────────────────────────────────────────────────────

export async function cmdRender() {
	const assignments = readAssignments();
	const active = assignments.filter((a) => a.status === "active");
	const humans = active.filter((a) => a.owner_type === "human");
	const agents = active.filter((a) => a.owner_type === "agent");

	function formatLine(a: Assignment): string {
		const issuePath = findIssueFile(a.task_id);
		let title = a.task_id;
		if (issuePath) {
			const { data } = readIssue(issuePath);
			title = (data.title as string | undefined) ?? data.id ?? a.task_id;
		}
		const path = issuePath ? relPath(issuePath) : "";
		const date = a.claimed_at.slice(0, 10);
		const link = path ? `[${title}](${path})` : title;
		return `- [-] ${link} (id:${a.task_id}) — ${a.owner} since ${date}`;
	}

	let flow = readFlow();
	flow = replaceSection(flow, "### Active", humans.map(formatLine).join("\n"));
	flow = replaceSection(
		flow,
		"## Agent Queue",
		agents.map(formatLine).join("\n"),
	);
	writeFlow(flow);
	return {
		active: active.length,
		humans: humans.length,
		agents: agents.length,
	};
}

// ── task list ─────────────────────────────────────────────────────────────────

export async function cmdList(args: string[]) {
	const flags = parseFlags(args);

	type IssueRow = IssueFrontmatter & { _path: string; _scope: string };
	let issues: IssueRow[] = walkIssues().map((p) => ({
		...readIssue(p).data,
		_path: p,
		_scope: scopeFromPath(p),
	}));

	if (flags.status) issues = issues.filter((i) => i.status === flags.status);
	if (flags.scope) issues = issues.filter((i) => i._scope === flags.scope);
	if (flags.owner) issues = issues.filter((i) => i.owner === flags.owner);
	if (flags.tag)
		issues = issues.filter(
			(i) => Array.isArray(i.tags) && i.tags.includes(flags.tag),
		);

	const out = issues.map(({ _path, _scope, ...rest }) => rest);

	if (issues.length === 0) {
		console.log("No issues found.");
		return { issues: out };
	}

	const COLS = ["id", "scope", "status", "priority", "owner", "title"] as const;
	const rows = issues.map((i) => [
		String(i.id ?? ""),
		String(i._scope ?? ""),
		String(i.status ?? ""),
		String(i.priority ?? ""),
		String(i.owner ?? ""),
		String(i.title ?? i.id ?? ""),
	]);

	const widths = COLS.map((c, idx) =>
		Math.max(c.length, ...rows.map((r) => r[idx].length)),
	);
	const fmt = (row: string[]) =>
		row.map((v, i) => v.padEnd(widths[i])).join("  ");

	console.log(fmt([...COLS]));
	console.log(widths.map((w) => "-".repeat(w)).join("  "));
	for (const row of rows) console.log(fmt(row));
	return { issues: out };
}

// ── task show ────────────────────────────────────────────────────────────────

export async function cmdShow(args: string[]) {
	const taskId = args[0];
	if (!taskId || args.length !== 1) die("Usage: task show <task-id>");

	const matches = findIssueFiles(taskId);
	if (matches.length === 0)
		domainError(`Issue not found for '${taskId}'`, "TASK_NOT_FOUND", {
			task_id: taskId,
		});
	if (matches.length > 1)
		domainError(`Multiple issues found for '${taskId}'`, "AMBIGUOUS_TASK_ID", {
			task_id: taskId,
			paths: matches.map(relPath),
		});

	const issuePath = matches[0];
	const { data: frontmatter, body } = readIssue(issuePath);
	const parsed = parseTaskLog(body);
	const assignmentHistory = readAssignments().filter(
		(assignment) => assignment.task_id === taskId,
	);
	const primaryAssignment =
		assignmentHistory.find((assignment) => assignment.status === "active") ??
		null;
	const taskLog = parsed.log ?? { commits: [], notes: [], history: [] };
	const result = {
		frontmatter,
		body: parsed.authoredBody,
		task_log: taskLog,
		task_log_errors: parsed.errors,
		path: relPath(issuePath),
		scope: scopeFromPath(issuePath),
		primary_assignment: primaryAssignment,
		has_active_assignment: primaryAssignment !== null,
		assignment_history: assignmentHistory,
	};

	console.log(`${frontmatter.title ?? frontmatter.id} (${frontmatter.id})`);
	console.log(`Path: ${result.path}`);
	console.log(`Scope: ${result.scope}`);
	console.log(`Status: ${frontmatter.status}`);
	console.log(`Priority: ${frontmatter.priority}`);
	console.log(`Owner: ${frontmatter.owner ?? "unassigned"}`);
	console.log(`Owner type: ${frontmatter.owner_type ?? "unassigned"}`);
	console.log(`Agent: ${frontmatter.agent_id ?? "none"}`);
	console.log(`Tags: ${frontmatter.tags.join(", ") || "none"}`);
	console.log(`Created: ${frontmatter.created_at}`);
	console.log(`Closed: ${frontmatter.closed_at ?? "not closed"}`);
	console.log(
		primaryAssignment
			? `Active assignment: ${primaryAssignment.owner} (${primaryAssignment.owner_type}), claimed ${primaryAssignment.claimed_at}`
			: "Active assignment: none",
	);
	console.log(`Assignment history: ${assignmentHistory.length} record(s)`);
	for (const assignment of assignmentHistory)
		console.log(
			`  ${assignment.status}: ${assignment.owner} (${assignment.owner_type}), claimed ${assignment.claimed_at}${assignment.released_at ? `, released ${assignment.released_at}` : ""}`,
		);
	console.log("\nBody:");
	console.log(parsed.authoredBody.trim() || "(empty)");
	console.log("\nTask Log:");
	console.log(`Commits: ${taskLog.commits.length}`);
	for (const commit of taskLog.commits)
		console.log(`  ${commit.hash} ${commit.subject}`.trimEnd());
	console.log(`Implementation notes: ${taskLog.notes.length}`);
	for (const note of taskLog.notes) console.log(`  ${note.id}`);
	console.log(`History: ${taskLog.history.length}`);
	for (const event of taskLog.history) console.log(`  ${event.text}`);
	for (const error of parsed.errors) console.log(`Task Log warning: ${error}`);

	return result;
}

// ── AI backends ───────────────────────────────────────────────────────────────

export interface IngestResult {
	type: string;
	scope?: string;
	slug?: string;
	title?: string;
	markdown?: string;
	clarification?: string;
}

// CLI tools that accept a prompt via flag and print to stdout.
// codex uses a subcommand instead of a flag.
export const CLI_BACKENDS: Record<
	string,
	{ bin: string; args: string[]; env?: Record<string, string> }
> = {
	gemini: {
		bin: "gemini",
		args: ["-p"],
		env: { GEMINI_CLI_TRUST_WORKSPACE: "true" },
	},
	claude: { bin: "claude", args: ["-p"] },
	copilot: { bin: "copilot", args: ["-p"] },
	codex: { bin: "codex", args: ["e"] },
};

export async function detectBackend(): Promise<string> {
	for (const [name, cfg] of Object.entries(CLI_BACKENDS)) {
		try {
			await $`which ${cfg.bin}`.quiet();
			return name;
		} catch {
			/* not in PATH */
		}
	}
	return "api";
}

// Extract the outermost JSON object from potentially conversational output.
export function extractJSON(text: string): string {
	// Strip markdown code fences first
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();

	// Walk to find outermost { }
	const start = text.indexOf("{");
	if (start === -1) return text;
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === "{") depth++;
		else if (text[i] === "}") {
			depth--;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return text;
}

export async function callAI(
	backend: string,
	systemPrompt: string,
	userMessage: string,
	apiKey?: string,
): Promise<IngestResult> {
	let raw: string;

	if (backend === "api") {
		if (!apiKey) die("Backend 'api' requires ANTHROPIC_API_KEY to be set");
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-20250514",
				max_tokens: 1000,
				system: systemPrompt,
				messages: [{ role: "user", content: userMessage }],
			}),
		});
		if (!response.ok) {
			const text = await response.text();
			operationalError(
				`Anthropic API error ${response.status}: ${text}`,
				"BACKEND_UNAVAILABLE",
				{ status: response.status },
			);
		}
		const payload = (await response.json()) as {
			content: { type: string; text: string }[];
		};
		raw = payload.content.find((c) => c.type === "text")?.text ?? "{}";
	} else {
		const cfg = CLI_BACKENDS[backend];
		if (!cfg)
			die(
				`Unknown backend: '${backend}'. Valid options: ${Object.keys(CLI_BACKENDS).join(", ")}, api`,
			);
		// Combine system + user into a single prompt since CLI tools have no separate system slot
		const fullPrompt = `${systemPrompt}\n\n---\n\nInput: ${userMessage}`;
		const env = { ...process.env, ...(cfg.env ?? {}) };
		const result = await $`${cfg.bin} ${cfg.args} ${fullPrompt}`
			.env(env)
			.text();
		raw = result;
	}

	try {
		return JSON.parse(extractJSON(raw)) as IngestResult;
	} catch {
		die(`Failed to parse AI response as JSON:\n${raw}`);
	}
}

// ── task ingest ───────────────────────────────────────────────────────────────

export async function cmdIngest(args: string[]) {
	const { templateName } = parseTemplateArg(args);
	const flags = parseFlags(args);
	const apiKey = process.env.ANTHROPIC_API_KEY;
	const template = resolveIssueTemplate(templateName);

	// Resolve backend: explicit flag > auto-detect
	let backend = flags.backend ?? "";
	if (!backend) {
		backend = await detectBackend();
		console.log(`Using backend: ${backend}`);
	}

	if (backend === "api" && !apiKey) {
		die("ANTHROPIC_API_KEY is not set (required for --backend api)");
	}

	const flow = readFlow();
	const scratchpad = extractSection(flow, "## Issue Scratchpad");
	const bullets = scratchpad.split("\n").filter((l) => /^\s*[-*]/.test(l));

	if (bullets.length === 0) {
		console.log("Issue Scratchpad is empty.");
		return { issues: [], processed: 0 };
	}

	const issuesDir = join(ROOT, "issues");
	const scopes = existsSync(issuesDir)
		? readdirSync(issuesDir).filter(
				(e) => statSync(join(issuesDir, e)).isDirectory() && e !== "templates",
			)
		: [];

	const SYSTEM_PROMPT = `You are a task management assistant. Classify each input bullet point from an issue scratchpad.

Available scopes: ${scopes.join(", ")}

Issue template to use verbatim for markdown output:
${template}

When generating issue markdown, replace the frontmatter placeholder values with real ones derived from the input.

Respond with ONLY valid JSON (no markdown fences, no extra text). Schema:
{
  "type": "issue" | "question" | "note" | "ambiguous",
  "scope": "<scope>",
  "slug": "<lowercase-hyphenated-slug>",
  "title": "<human readable title>",
  "markdown": "<complete file content: frontmatter + body>",
  "clarification": "<single clarifying question if ambiguous>"
}

Rules:
- For "issue": populate scope, slug, title, markdown. Frontmatter must include id (= slug), title, status: needs-triage, priority (P1–P4), owner: human, tags: [scope], created_at: ${today()}.
- For "ambiguous": populate clarification only.
- For "question" or "note": return only the type field.`;

	const newFiles: string[] = [];

	for (const bullet of bullets) {
		console.log(`\nProcessing: ${bullet.trim()}`);
		let result = await callAI(backend, SYSTEM_PROMPT, bullet, apiKey);

		if (result.type === "ambiguous") {
			if (isJsonMode())
				usageError(
					`Clarification required: ${result.clarification ?? "additional input is required"}`,
					"MISSING_INPUT",
					{
						clarification: result.clarification ?? null,
						uncommitted_issue_ids: newFiles.map((path) =>
							basename(path, ".md"),
						),
					},
				);
			const answer = await prompt(
				`Clarification needed: ${result.clarification}\n> `,
			);
			result = await callAI(
				backend,
				SYSTEM_PROMPT,
				`${bullet}\nClarification: ${answer}`,
				apiKey,
			);
		}

		if (result.type === "question" || result.type === "note") {
			console.log(`  Skipped (${result.type})`);
			continue;
		}

		if (
			result.type === "issue" &&
			result.scope &&
			result.slug &&
			result.markdown
		) {
			const scopeDir = join(ROOT, "issues", result.scope);
			if (!existsSync(scopeDir)) mkdirSync(scopeDir, { recursive: true });
			const filePath = join(scopeDir, `${result.slug}.md`);
			writeFileSync(filePath, result.markdown);
			newFiles.push(filePath);
			console.log(`  Created: ${relPath(filePath)}`);
		} else {
			console.log(`  Skipped (unrecognized response type: ${result.type})`);
		}
	}

	// Clear scratchpad
	writeFlow(replaceSection(flow, "## Issue Scratchpad", ""));

	const toAdd = [...newFiles, FLOW_PATH];
	await gitAdd(toAdd);
	await gitCommit(
		`ingest: ${newFiles.length} issue(s) created from scratchpad`,
	);
	console.log(`\nIngested ${newFiles.length} issue(s).`);
	return {
		issues: newFiles.map(relPath),
		processed: bullets.length,
		backend,
	};
}
