import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
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
import { fixtureForTask, roleForFixture, slotsForFixture } from "./fixtures";
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
	withTakeLock,
	writeAssignments,
	writeFlow,
	writeIssue,
} from "./repository";
import { ROOT } from "./runtime";
import {
	appendCommit,
	appendHistoryEvent,
	appendNote,
	noteTextContainsTaskLogMarker,
	parseStructuredTaskLogNotes,
	parseTaskLog,
} from "./task-log";
import type { Assignment, IssueFrontmatter } from "./types";

// ── Utilities ─────────────────────────────────────────────────────────────────

export function die(msg: string): never {
	if (msg.startsWith("Usage:")) usageError(msg);
	if (msg.includes("already claimed")) domainError(msg, "TASK_ALREADY_CLAIMED");
	if (msg.startsWith("Issue not found")) domainError(msg, "TASK_NOT_FOUND");
	if (msg.startsWith("No active assignment"))
		domainError(msg, "NO_ACTIVE_ASSIGNMENT");
	if (msg.startsWith("Claim '")) domainError(msg, "CLAIM_MISMATCH");
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
		try {
			fixtureForTask(data);
		} catch (error) {
			err(`${rel}: ${(error as Error).message}`);
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
		const activePrimaryCounts = new Map<string, number>();
		const activeParticipantSlots = new Map<string, Set<string>>();
		for (const a of assignments) {
			if (a.status !== "active") continue;
			if (a.assignment_type === "participant") {
				if (
					a.owner_type !== "agent" ||
					!a.role ||
					!a.slot ||
					!a.claim_id ||
					!a.lease_until
				) {
					err(
						`assignments.yaml: participant assignment for '${a.task_id}' must have an agent, role, slot, claim_id, and lease_until`,
					);
				}
				const slots =
					activeParticipantSlots.get(a.task_id) ?? new Set<string>();
				if (slots.has(a.slot ?? ""))
					err(
						`assignments.yaml: duplicate active participant slot '${a.slot}' for task_id '${a.task_id}'`,
					);
				slots.add(a.slot ?? "");
				activeParticipantSlots.set(a.task_id, slots);
			} else {
				activePrimaryCounts.set(
					a.task_id,
					(activePrimaryCounts.get(a.task_id) ?? 0) + 1,
				);
			}
		}
		for (const [id, count] of activePrimaryCounts) {
			if (count > 1)
				err(
					`assignments.yaml: ${count} active primary records for task_id '${id}' (must be unique)`,
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

	const createdAt = new Date().toISOString();
	await commitWithRollback(`new(${slug})`, [filePath], async () => {
		const body = appendHistoryEvent(templateBody, {
			id: `create-${createdAt}`,
			text: `- ${createdAt} — task created by human`,
		});
		writeFileSync(filePath, `${serializeFrontmatter(fm)}\n${body}`);
		await gitAdd([filePath]);
	});
	console.log(relPath(filePath));
	return { task: fm, path: relPath(filePath) };
}

// ── task claim ────────────────────────────────────────────────────────────────

export async function cmdClaim(args: string[]) {
	const taskId = args[0];
	if (!taskId)
		die(
			"Usage: task claim <task-id> [--owner <name>] [--agent <id>] [--role <role> --slot <slot> [--run <run-id>]] [--worktree <path>] [--branch <branch>] [--lease <minutes>]",
		);

	const flags = parseFlags(args.slice(1));
	const agentId = flags.agent ?? null;
	const owner = flags.owner ?? (agentId ? agentId : "human");
	const worktree = flags.worktree ?? null;
	const branch = flags.branch ?? null;
	const leaseMinutes = flags.lease ? parseInt(flags.lease, 10) : null;
	const ownerType: "human" | "agent" = agentId ? "agent" : "human";
	const participant = Boolean(flags.role || flags.slot || flags.run);

	if (ownerType === "agent" && !leaseMinutes)
		die("Agent claims require --lease <minutes>");
	if (participant && (!agentId || !flags.role || !flags.slot))
		die(
			"Participant claims require --agent <id>, --role <role>, --slot <slot>, and --lease <minutes>",
		);
	for (const [field, value] of [
		["role", flags.role],
		["slot", flags.slot],
		["run", flags.run],
	] as const) {
		if (value?.match(/[\s=>]/))
			usageError(`Claim ${field} must not contain whitespace, '=' or '>'.`);
	}

	const options: ClaimOptions = {
		agentId,
		owner,
		ownerType,
		worktree,
		branch,
		leaseMinutes,
		assignmentType: participant ? "participant" : "primary",
		role: participant ? (flags.role ?? null) : null,
		slot: participant ? (flags.slot ?? null) : null,
		runId: participant ? (flags.run ?? null) : null,
	};
	const record = participant
		? await withTakeLock(agentId as string, () => claimTask(taskId, options))
		: await claimTask(taskId, options);
	console.log(`Claimed '${taskId}' by '${owner}'`);
	return { task_id: taskId, assignment: record };
}

interface ClaimOptions {
	agentId: string | null;
	owner: string;
	ownerType: "human" | "agent";
	worktree: string | null;
	branch: string | null;
	leaseMinutes: number | null;
	assignmentType: "primary" | "participant";
	role: string | null;
	slot: string | null;
	runId: string | null;
}

function isParticipant(assignment: Assignment): boolean {
	return assignment.assignment_type === "participant";
}

function activePrimaryIndex(assignments: Assignment[], taskId: string): number {
	return assignments.findIndex(
		(assignment) =>
			assignment.task_id === taskId &&
			assignment.status === "active" &&
			!isParticipant(assignment),
	);
}

function activeClaimIndex(
	assignments: Assignment[],
	taskId: string,
	claimId: string,
): number {
	return assignments.findIndex(
		(assignment) =>
			assignment.task_id === taskId &&
			assignment.status === "active" &&
			assignment.claim_id === claimId,
	);
}

interface ExpiredClaim {
	assignment: Assignment;
	issuePath: string | null;
}

function expireEligibleClaims(
	assignments: Assignment[],
	now: Date,
): ExpiredClaim[] {
	return assignments
		.filter(
			(assignment) =>
				assignment.status === "active" &&
				assignment.lease_until &&
				new Date(assignment.lease_until) < now,
		)
		.map((assignment) => {
			assignment.status = "expired";
			return { assignment, issuePath: findIssueFile(assignment.task_id) };
		});
}

function writeExpiredClaimIssues(
	expired: ExpiredClaim[],
	assignments: Assignment[],
	expiredAt: string,
): void {
	for (const { assignment, issuePath } of expired) {
		if (!issuePath) continue;
		const { data, body } = readIssue(issuePath);
		const activePrimary = assignments.find(
			(candidate) =>
				candidate.task_id === assignment.task_id &&
				candidate.status === "active" &&
				!isParticipant(candidate),
		);
		const hasActiveParticipant = assignments.some(
			(candidate) =>
				candidate.task_id === assignment.task_id &&
				candidate.status === "active" &&
				isParticipant(candidate),
		);
		if (!activePrimary && !hasActiveParticipant)
			data.status = "ready-for-agent";
		else data.status = "in-progress";
		if (activePrimary) {
			data.owner = activePrimary.owner;
			data.owner_type = activePrimary.owner_type;
			data.agent_id = activePrimary.agent_id;
		} else {
			data.owner = "human";
			data.owner_type = "human";
			data.agent_id = null;
		}
		writeIssue(
			issuePath,
			data,
			appendHistoryEvent(body, {
				id: `expiry-${assignment.lease_until}`,
				text: `- ${expiredAt} — ${assignment.owner} claim expired`,
			}),
		);
	}
}

async function claimTask(
	taskId: string,
	options: ClaimOptions,
	assignments = readAssignments(),
	expired: ExpiredClaim[] = [],
	message = `claim(${taskId}): ${options.owner}`,
): Promise<Assignment> {
	const issuePath = findIssueFile(taskId);
	let fixtureId: string | null = null;
	let roleCapacity: number | null = null;
	if (options.assignmentType === "participant") {
		if (!issuePath) die(`Issue not found for '${taskId}'`);
		const fixture = fixtureForTask(readIssue(issuePath).data);
		if (!fixture)
			die(
				`Task '${taskId}' does not select a crew fixture; participant claims require fixture: <id>.`,
			);
		const role = roleForFixture(fixture, options.role ?? "");
		if (!role)
			die(`Fixture '${fixture.id}' does not define role '${options.role}'.`);
		const expectedSlots = slotsForFixture(fixture)
			.filter((slot) => slot.role === role.role)
			.map((slot) => slot.slot);
		if (!expectedSlots.includes(options.slot ?? ""))
			die(
				`Fixture '${fixture.id}' role '${role.role}' accepts slots: ${expectedSlots.join(", ")}.`,
			);
		fixtureId = fixture.id;
		roleCapacity = role.slots;
	}
	const conflict = assignments.find((assignment) => {
		if (assignment.task_id !== taskId || assignment.status !== "active")
			return false;
		if (options.assignmentType === "participant")
			return isParticipant(assignment) && assignment.slot === options.slot;
		return !isParticipant(assignment);
	});
	if (conflict) die(`Task '${taskId}' already claimed by '${conflict.owner}'`);
	if (options.assignmentType === "participant") {
		const activeRoleClaims = assignments.filter(
			(assignment) =>
				assignment.task_id === taskId &&
				assignment.status === "active" &&
				isParticipant(assignment) &&
				assignment.role === options.role,
		);
		if (activeRoleClaims.length >= (roleCapacity as number))
			die(
				`Fixture '${fixtureId}' role '${options.role}' is at capacity (${roleCapacity} active slot${roleCapacity === 1 ? "" : "s"}).`,
			);
	}

	const expiredTaskIds = new Set(
		expired.map(({ assignment }) => assignment.task_id),
	);
	if (issuePath) {
		const { data } = readIssue(issuePath);
		const claimableStatuses = new Set([
			"open",
			"ready-for-agent",
			"ready-for-human",
		]);
		const hasActiveParticipant = assignments.some(
			(assignment) =>
				assignment.task_id === taskId &&
				assignment.status === "active" &&
				isParticipant(assignment),
		);
		const hasActivePrimary = activePrimaryIndex(assignments, taskId) !== -1;
		if (
			!claimableStatuses.has(data.status) &&
			!expiredTaskIds.has(taskId) &&
			!hasActiveParticipant &&
			!hasActivePrimary
		) {
			die(
				`Task '${taskId}' has status '${data.status}' and cannot be claimed. Claimable statuses: open, ready-for-agent, ready-for-human`,
			);
		}
	}

	const leaseUntil = options.leaseMinutes
		? new Date(Date.now() + options.leaseMinutes * 60_000).toISOString()
		: null;
	const baseCommit =
		options.ownerType === "agent" && options.worktree
			? await captureBaseCommit(options.worktree)
			: null;
	const record: Assignment = {
		task_id: taskId,
		status: "active",
		owner: options.owner,
		owner_type: options.ownerType,
		agent_id: options.agentId,
		assignment_type:
			options.assignmentType === "participant" ? "participant" : null,
		role: options.role,
		slot: options.slot,
		run_id: options.runId,
		worktree: options.worktree,
		branch: options.branch,
		claim_id: options.ownerType === "agent" ? crypto.randomUUID() : null,
		base_commit: baseCommit,
		claimed_at: new Date().toISOString(),
		lease_until: leaseUntil,
		completed_at: null,
		released_at: null,
		outcome: null,
		note_id: null,
	};
	const changedFiles = [
		ASSIGNMENTS_PATH,
		FLOW_PATH,
		...expired
			.map(({ issuePath: path }) => path)
			.filter((path): path is string => path !== null),
		...(issuePath ? [issuePath] : []),
	];

	await commitWithRollback(message, changedFiles, async () => {
		if (expired.length > 0)
			writeExpiredClaimIssues(expired, assignments, record.claimed_at);
		assignments.push(record);
		writeAssignments(assignments);

		if (issuePath) {
			const { data, body } = readIssue(issuePath);
			data.status = "in-progress";
			if (options.assignmentType === "primary") {
				data.owner = options.owner;
				data.owner_type = options.ownerType;
				data.agent_id = options.agentId;
			}
			writeIssue(
				issuePath,
				data,
				appendHistoryEvent(body, {
					id: `claim-${record.claimed_at}`,
					text:
						options.assignmentType === "participant"
							? `- ${record.claimed_at} — ${options.owner} claimed participant slot '${options.slot}' as ${options.role}${options.runId ? ` (run ${options.runId})` : ""}`
							: `- ${record.claimed_at} — ${options.owner} claimed task`,
				}),
			);
		}

		await cmdRender();
		await gitAdd(changedFiles);
	});
	return record;
}

async function commitExpiredClaims(
	assignments: Assignment[],
	expired: ExpiredClaim[],
	message: string,
	expiredAt: string,
): Promise<void> {
	if (expired.length === 0) return;
	const changedFiles = [
		ASSIGNMENTS_PATH,
		FLOW_PATH,
		...expired
			.map(({ issuePath }) => issuePath)
			.filter((path): path is string => path !== null),
	];
	await commitWithRollback(message, changedFiles, async () => {
		writeExpiredClaimIssues(expired, assignments, expiredAt);
		writeAssignments(assignments);
		await cmdRender();
		await gitAdd(changedFiles);
	});
}

function requireClaim(
	assignment: Assignment | undefined,
	taskId: string,
	claimId: string | undefined,
): void {
	if (!claimId) return;
	if (!assignment || assignment.claim_id !== claimId)
		die(`Claim '${claimId}' is not the active claim for '${taskId}'`);
}

function leaseFromNow(value: string | undefined): {
	minutes: number;
	until: string;
} {
	const minutes = value ? Number(value) : NaN;
	if (!Number.isInteger(minutes) || minutes <= 0)
		die("Usage: task renew <task-id> --claim <claim-id> --lease <minutes>");
	return {
		minutes,
		until: new Date(Date.now() + minutes * 60_000).toISOString(),
	};
}

// ── task renew ───────────────────────────────────────────────────────────────

export async function cmdRenew(args: string[]) {
	const taskId = args[0];
	const flags = parseFlags(args.slice(1));
	if (!taskId || !flags.claim)
		die("Usage: task renew <task-id> --claim <claim-id> --lease <minutes>");
	const lease = leaseFromNow(flags.lease);
	const assignments = readAssignments();
	const idx = activeClaimIndex(assignments, taskId, flags.claim);
	const assignment = idx === -1 ? undefined : assignments[idx];
	requireClaim(assignment, taskId, flags.claim);
	if (assignment?.owner_type !== "agent")
		die(`Claim '${flags.claim}' is not the active claim for '${taskId}'`);

	await commitWithRollback(`renew(${taskId})`, [ASSIGNMENTS_PATH], async () => {
		assignments[idx].lease_until = lease.until;
		writeAssignments(assignments);
		await gitAdd([ASSIGNMENTS_PATH]);
	});
	console.log(`Renewed '${taskId}' until ${lease.until}`);
	return {
		task_id: taskId,
		assignment: assignments[idx],
		lease_minutes: lease.minutes,
	};
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
	const triagedAt = new Date().toISOString();

	await commitWithRollback(
		`triage(${taskId}): ${previousStatus} -> ${newStatus}`,
		[issuePath],
		async () => {
			writeIssue(
				issuePath,
				data,
				appendHistoryEvent(body, {
					id: `triage-${triagedAt}`,
					text: `- ${triagedAt} — task triaged ${previousStatus} -> ${newStatus}`,
				}),
			);
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
	if (!taskId)
		die("Usage: task release <task-id> [--reason <note>] [--claim <claim-id>]");
	const flags = parseFlags(args.slice(1));

	const assignments = readAssignments();
	const idx = flags.claim
		? activeClaimIndex(assignments, taskId, flags.claim)
		: activePrimaryIndex(assignments, taskId);
	if (idx === -1 && flags.claim) requireClaim(undefined, taskId, flags.claim);
	if (idx === -1) die(`No active assignment for '${taskId}'`);
	requireClaim(assignments[idx], taskId, flags.claim);

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
			const hasActiveAssignment = assignments.some(
				(assignment) =>
					assignment.task_id === taskId && assignment.status === "active",
			);
			const hasActivePrimary = activePrimaryIndex(assignments, taskId) !== -1;
			if (!hasActiveAssignment) data.status = "open";
			if (!hasActivePrimary) {
				data.owner = "human";
				data.owner_type = "human";
				data.agent_id = null;
			}
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

// ── task note ────────────────────────────────────────────────────────────────

interface NoteArguments {
	taskId?: string;
	text?: string;
	kind: string;
	author?: string;
	claim?: string;
	run?: string;
	stdin: boolean;
}

function parseNoteArgs(args: string[]): NoteArguments {
	const positional: string[] = [];
	const parsed: NoteArguments = { kind: "comment", stdin: false };
	const valueFlags = new Set(["kind", "author", "claim", "run"]);

	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}
		const key = arg.slice(2);
		if (key === "stdin") {
			parsed.stdin = true;
			continue;
		}
		if (!valueFlags.has(key) || !args[index + 1]?.length) {
			die(
				"Usage: task note <task-id> [text] [--kind <kind>] [--author <name>] [--claim <claim-id>] [--run <run-id>] [--stdin]",
			);
		}
		parsed[key as "kind" | "author" | "claim" | "run"] = args[++index];
	}

	parsed.taskId = positional.shift();
	if (positional.length > 0) parsed.text = positional.join(" ");
	return parsed;
}

export async function cmdNote(args: string[]) {
	const parsed = parseNoteArgs(args);
	if (!parsed.taskId)
		die(
			"Usage: task note <task-id> [text] [--kind <kind>] [--author <name>] [--claim <claim-id>] [--run <run-id>] [--stdin]",
		);
	if (parsed.stdin && parsed.text)
		die("Usage: task note accepts either positional text or --stdin, not both");

	const issuePath = findIssueFile(parsed.taskId);
	if (!issuePath) die(`Issue not found for '${parsed.taskId}'`);

	const text = (parsed.stdin ? await Bun.stdin.text() : parsed.text)?.trim();
	if (!text)
		usageError("Note text is required.", "MISSING_INPUT", {
			task_id: parsed.taskId,
			input: parsed.stdin ? "stdin" : "positional",
		});
	if (noteTextContainsTaskLogMarker(text))
		usageError("Note text must not contain Docket Task Log markers");

	const activeAssignment = readAssignments().find(
		(assignment) =>
			assignment.task_id === parsed.taskId &&
			assignment.status === "active" &&
			!isParticipant(assignment),
	);
	const author =
		parsed.author ??
		activeAssignment?.owner ??
		(isJsonMode() ? undefined : "human");
	if (!author)
		usageError(
			"Note author is required when the task has no active assignment.",
			"MISSING_INPUT",
			{ task_id: parsed.taskId, field: "author" },
		);

	for (const [field, value] of [
		["kind", parsed.kind],
		["claim", parsed.claim],
		["run", parsed.run],
	] as const) {
		if (value?.match(/[\s=>]/))
			usageError(`Note ${field} must not contain whitespace, '=' or '>'.`);
	}
	if (author.match(/[\r\n]/))
		usageError("Note author must not contain a line break.");

	const timestamp = new Date().toISOString();
	const note = {
		id: `note-${timestamp}`,
		timestamp,
		kind: parsed.kind,
		author,
		body: text,
		...(parsed.claim ? { claim: parsed.claim } : {}),
		...(parsed.run ? { run: parsed.run } : {}),
	};

	await commitWithRollback(
		`note(${parsed.taskId}): ${parsed.kind}`,
		[issuePath],
		async () => {
			const { data, body } = readIssue(issuePath);
			writeIssue(issuePath, data, appendNote(body, note));
			await gitAdd([issuePath]);
		},
	);
	console.log(`Added ${parsed.kind} note to '${parsed.taskId}'`);
	return { task_id: parsed.taskId, note };
}

// ── task finish ──────────────────────────────────────────────────────────────

interface FinishArguments {
	taskId?: string;
	claim?: string;
	outcome: string;
	note?: string;
	stdin: boolean;
}

function parseFinishArgs(args: string[]): FinishArguments {
	const positional: string[] = [];
	const parsed: FinishArguments = { outcome: "completed", stdin: false };
	const valueFlags = new Set(["claim", "outcome", "note"]);
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}
		const key = arg.slice(2);
		if (key === "stdin") {
			parsed.stdin = true;
			continue;
		}
		if (!valueFlags.has(key) || !args[index + 1]?.length)
			die(
				"Usage: task finish <task-id> --claim <claim-id> [--outcome <outcome>] [--note <text> | --stdin]",
			);
		parsed[key as "claim" | "outcome" | "note"] = args[++index];
	}
	parsed.taskId = positional.shift();
	if (positional.length > 0)
		die(
			"Usage: task finish <task-id> --claim <claim-id> [--outcome <outcome>] [--note <text> | --stdin]",
		);
	return parsed;
}

export async function cmdFinish(args: string[]) {
	const parsed = parseFinishArgs(args);
	if (!parsed.taskId || !parsed.claim)
		die(
			"Usage: task finish <task-id> --claim <claim-id> [--outcome <outcome>] [--note <text> | --stdin]",
		);
	if (parsed.stdin && parsed.note)
		die("Usage: task finish accepts either --note <text> or --stdin, not both");
	if (parsed.outcome.match(/[\r\n]/))
		usageError("Finish outcome must not contain a line break.");
	const noteText = (
		parsed.stdin ? await Bun.stdin.text() : parsed.note
	)?.trim();
	if (noteText && noteTextContainsTaskLogMarker(noteText))
		usageError("Note text must not contain Docket Task Log markers");

	const issuePath = findIssueFile(parsed.taskId);
	if (!issuePath) die(`Issue not found for '${parsed.taskId}'`);
	const assignments = readAssignments();
	const idx = activeClaimIndex(assignments, parsed.taskId, parsed.claim);
	const assignment = idx === -1 ? undefined : assignments[idx];
	requireClaim(assignment, parsed.taskId, parsed.claim);
	if (!assignment || !isParticipant(assignment))
		die(
			`Claim '${parsed.claim}' is not an active participant claim for '${parsed.taskId}'`,
		);

	const completedAt = new Date().toISOString();
	const note = noteText
		? {
				id: `note-${crypto.randomUUID()}`,
				timestamp: completedAt,
				kind: "outcome",
				author: assignment.owner,
				body: noteText,
				claim: assignment.claim_id ?? parsed.claim,
				...(assignment.run_id ? { run: assignment.run_id } : {}),
			}
		: null;
	const changedFiles = [ASSIGNMENTS_PATH, FLOW_PATH, issuePath];

	await commitWithRollback(
		`finish(${parsed.taskId}): ${assignment.owner}`,
		changedFiles,
		async () => {
			assignments[idx].status = "completed";
			assignments[idx].completed_at = completedAt;
			assignments[idx].outcome = parsed.outcome;
			assignments[idx].note_id = note?.id ?? null;
			writeAssignments(assignments);
			const { data, body } = readIssue(issuePath);
			const hasActiveAssignment = assignments.some(
				(candidate) =>
					candidate.task_id === parsed.taskId && candidate.status === "active",
			);
			if (!hasActiveAssignment) {
				data.status = "open";
				data.owner = "human";
				data.owner_type = "human";
				data.agent_id = null;
			}
			let updatedBody = body;
			if (note) updatedBody = appendNote(updatedBody, note);
			updatedBody = appendHistoryEvent(updatedBody, {
				id: `finish-${assignment.claim_id ?? parsed.claim}-${completedAt}`,
				text: `- ${completedAt} — ${assignment.owner} finished participant slot '${assignment.slot}' with outcome '${parsed.outcome}'`,
			});
			writeIssue(issuePath, data, updatedBody);
			await cmdRender();
			await gitAdd(changedFiles);
		},
	);
	console.log(
		`Finished participant claim '${parsed.claim}' on '${parsed.taskId}' with outcome '${parsed.outcome}'`,
	);
	return {
		task_id: parsed.taskId,
		assignment: assignments[idx],
		note,
	};
}

// ── task commits ─────────────────────────────────────────────────────────────

interface GitResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

async function gitIn(worktree: string, args: string[]): Promise<GitResult> {
	const process = Bun.spawn(["git", "-C", worktree, ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

function isDocketStateCommit(subject: string): boolean {
	return /^(claim|triage|close|release|finish|note|new|render|doctor)\(/.test(
		subject,
	);
}

async function applicationWorktree(
	assignment: Assignment | undefined,
): Promise<{ worktree: string } | { warning: string }> {
	if (!assignment?.worktree)
		return {
			warning:
				"No application worktree was recorded for this active claim. Re-claim with --worktree <application-repository> or use commits add after recording the hash.",
		};
	if (!existsSync(assignment.worktree))
		return {
			warning: `Recorded application worktree '${assignment.worktree}' no longer exists. Use commits add with an explicit hash after restoring the repository.`,
		};
	let worktree: string;
	try {
		worktree = realpathSync(assignment.worktree);
	} catch {
		return {
			warning: `Recorded application worktree '${assignment.worktree}' cannot be resolved. Use commits add with an explicit hash after restoring the repository.`,
		};
	}
	if (worktree === realpathSync(ROOT))
		return {
			warning:
				"Recorded worktree is Docket's task worktree. Docket state commits are never implementation commits; use a separate application worktree.",
		};
	const probe = await gitIn(worktree, ["rev-parse", "--is-inside-work-tree"]);
	if (probe.exitCode !== 0 || probe.stdout !== "true")
		return {
			warning: `Recorded application worktree '${assignment.worktree}' is not a Git worktree. Use commits add with an explicit hash after correcting the claim.`,
		};
	return { worktree };
}

async function captureBaseCommit(worktree: string): Promise<string | null> {
	const candidate = await applicationWorktree({
		task_id: "",
		status: "active",
		owner: "",
		owner_type: "agent",
		agent_id: null,
		worktree,
		branch: null,
		claimed_at: "",
		lease_until: null,
		released_at: null,
	});
	if ("warning" in candidate) {
		console.warn(`Base commit was not captured: ${candidate.warning}`);
		return null;
	}
	const head = await gitIn(candidate.worktree, ["rev-parse", "HEAD"]);
	if (head.exitCode !== 0) {
		console.warn(
			`Base commit was not captured: '${worktree}' has no readable HEAD. commits detect will require commits add.`,
		);
		return null;
	}
	return head.stdout;
}

async function resolveImplementationCommit(
	worktree: string,
	value: string,
): Promise<{ hash: string; subject: string }> {
	const resolved = await gitIn(worktree, ["rev-parse", `${value}^{commit}`]);
	if (resolved.exitCode !== 0 || !resolved.stdout)
		throw new Error(`Commit '${value}' is not a commit in ${worktree}.`);
	const subject = await gitIn(worktree, [
		"show",
		"-s",
		"--format=%s",
		resolved.stdout,
	]);
	if (subject.exitCode !== 0)
		throw new Error(
			`Unable to read commit '${resolved.stdout}' in ${worktree}.`,
		);
	if (isDocketStateCommit(subject.stdout))
		throw new Error(
			`Commit '${resolved.stdout}' is Docket state evidence, not an implementation commit.`,
		);
	return { hash: resolved.stdout, subject: subject.stdout };
}

async function recordCommits(
	taskId: string,
	issuePath: string,
	commits: { hash: string; subject: string }[],
): Promise<{ hash: string; subject: string }[]> {
	const { body } = readIssue(issuePath);
	const existing = parseTaskLog(body).log?.commits ?? [];
	const additions = commits.filter(
		(commit) =>
			!existing.some(
				(recorded) =>
					recorded.hash === commit.hash ||
					commit.hash.startsWith(recorded.hash),
			),
	);
	if (additions.length === 0) return [];
	await commitWithRollback(`commits(${taskId})`, [issuePath], async () => {
		const { data, body: currentBody } = readIssue(issuePath);
		let updatedBody = currentBody;
		for (const commit of additions)
			updatedBody = appendCommit(updatedBody, commit);
		writeIssue(issuePath, data, updatedBody);
		await gitAdd([issuePath]);
	});
	return additions;
}

export async function cmdCommits(args: string[]) {
	const [subcommand, taskId, ...values] = args;
	if (!subcommand || !taskId)
		die("Usage: task commits <list|add|detect> <task-id> [hash ...]");
	const issuePath = findIssueFile(taskId);
	if (!issuePath) die(`Issue not found for '${taskId}'`);
	const { body } = readIssue(issuePath);

	if (subcommand === "list") {
		if (values.length > 0) die("Usage: task commits list <task-id>");
		const commits = parseTaskLog(body).log?.commits ?? [];
		console.log(`Implementation commits for '${taskId}':`);
		for (const commit of commits)
			console.log(
				`${commit.display_hash ?? commit.hash.slice(0, 12)} ${commit.subject}`,
			);
		return { task_id: taskId, commits };
	}

	const assignment = readAssignments().find(
		(record) => record.task_id === taskId && record.status === "active",
	);
	const candidate = await applicationWorktree(assignment);
	if ("warning" in candidate) {
		console.warn(candidate.warning);
		return { task_id: taskId, commits: [], recorded: [], detected: false };
	}

	if (subcommand === "add") {
		const hashes: string[] = [];
		for (let index = 0; index < values.length; index++) {
			if (values[index] === "--claim") {
				if (!values[index + 1])
					die(
						"Usage: task commits add <task-id> <hash>... [--claim <claim-id>]",
					);
				index++;
				continue;
			}
			hashes.push(values[index]);
		}
		if (hashes.length === 0) die("Usage: task commits add <task-id> <hash>...");
		const commits = [] as { hash: string; subject: string }[];
		for (const hash of hashes)
			commits.push(await resolveImplementationCommit(candidate.worktree, hash));
		const recorded = await recordCommits(taskId, issuePath, commits);
		console.log(
			`Recorded ${recorded.length} implementation commit(s) for '${taskId}'`,
		);
		return { task_id: taskId, commits, recorded };
	}

	if (
		subcommand !== "detect" ||
		(values.length > 0 &&
			!(values.length === 2 && values[0] === "--claim" && values[1]))
	)
		die("Usage: task commits detect <task-id> [--claim <claim-id>]");
	if (!assignment?.base_commit) {
		console.warn(
			"No base commit was captured for this claim. Automatic detection is skipped; use commits add <task-id> <hash> instead.",
		);
		return { task_id: taskId, commits: [], recorded: [], detected: false };
	}
	const reachable = await gitIn(candidate.worktree, [
		"merge-base",
		"--is-ancestor",
		assignment.base_commit,
		"HEAD",
	]);
	if (reachable.exitCode !== 0) {
		console.warn(
			`Base commit '${assignment.base_commit}' is no longer reachable from HEAD; history may have been rewritten. Automatic detection is skipped; use commits add <task-id> <hash> instead.`,
		);
		return { task_id: taskId, commits: [], recorded: [], detected: false };
	}
	const range = await gitIn(candidate.worktree, [
		"log",
		"--format=%H%x00%s",
		`${assignment.base_commit}..HEAD`,
	]);
	if (range.exitCode !== 0)
		throw new Error(
			`Unable to inspect ${assignment.base_commit}..HEAD in ${candidate.worktree}.`,
		);
	const commits = range.stdout
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [hash, subject] = line.split("\0", 2);
			return { hash, subject };
		})
		.filter((commit) => !isDocketStateCommit(commit.subject));
	const recorded = await recordCommits(taskId, issuePath, commits);
	console.log(
		`Detected ${commits.length} implementation commit(s); recorded ${recorded.length}.`,
	);
	return { task_id: taskId, commits, recorded, detected: true };
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
	const newPath = join(doneDir, `${today()}-${taskId}.md`);
	const assignments = readAssignments();
	const idx = flags.claim
		? activeClaimIndex(assignments, taskId, flags.claim)
		: activePrimaryIndex(assignments, taskId);
	if (idx === -1 && flags.claim) requireClaim(undefined, taskId, flags.claim);
	const assignment = idx === -1 ? undefined : assignments[idx];
	requireClaim(assignment, taskId, flags.claim);
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
			if (!existsSync(doneDir)) mkdirSync(doneDir, { recursive: true });
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

			// Closing a task releases every still-active primary or participant claim.
			const releasedAt = new Date().toISOString();
			let releasedAny = false;
			for (const assignment of assignments) {
				if (assignment.task_id === taskId && assignment.status === "active") {
					assignment.status = "released";
					assignment.released_at = releasedAt;
					releasedAny = true;
				}
			}
			if (releasedAny) writeAssignments(assignments);

			await cmdRender();

			// Stage the moved issue and any generated task files in the task worktree.
			await gitAdd([newPath, FLOW_PATH]);
			await gitAddUpdate([issuePath]);
			if (releasedAny) await gitAdd([ASSIGNMENTS_PATH]);
		},
	);
	console.log(`Closed '${taskId}' → ${relPath(newPath)}`);
	return { task_id: taskId, status: data.status, path: relPath(newPath) };
}

// ── task doctor ───────────────────────────────────────────────────────────────

export async function cmdDoctor() {
	const assignments = readAssignments();
	const now = new Date();
	const warnings: string[] = [];
	const expired = expireEligibleClaims(assignments, now);

	for (const { assignment } of expired) {
		const message = `EXPIRED: ${assignment.task_id} (lease was ${assignment.lease_until})`;
		warnings.push(message);
		console.warn(message);
	}

	if (expired.length > 0) {
		const issuePaths = expired
			.map(({ issuePath }) => issuePath)
			.filter((path): path is string => path !== null);
		await commitWithRollback(
			`doctor: expire ${expired.length} lease(s)`,
			[ASSIGNMENTS_PATH, FLOW_PATH, ...issuePaths],
			async () => {
				writeExpiredClaimIssues(expired, assignments, now.toISOString());
				writeAssignments(assignments);
				await cmdRender();
				await gitAdd([ASSIGNMENTS_PATH, FLOW_PATH, ...issuePaths]);
			},
		);
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
	return { mutated: expired.length > 0, warnings };
}

// ── task render ───────────────────────────────────────────────────────────────

export async function cmdRender() {
	const assignments = readAssignments();
	const active = assignments.filter((a) => a.status === "active");
	const primaries = active.filter((a) => !isParticipant(a));
	const humans = primaries.filter((a) => a.owner_type === "human");
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
		const participant = isParticipant(a)
			? ` — participant ${a.role}/${a.slot}${a.run_id ? ` (run ${a.run_id})` : ""}`
			: "";
		return `- [-] ${link} (id:${a.task_id}) — ${a.owner}${participant} since ${date}`;
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

export type IssueRow = IssueFrontmatter & { _path: string; _scope: string };

export function filterIssueRows(
	issues: IssueRow[],
	flags: Record<string, string>,
): IssueRow[] {
	let filtered = issues;

	if (flags.status)
		filtered = filtered.filter((issue) => issue.status === flags.status);
	if (flags.scope)
		filtered = filtered.filter((issue) => issue._scope === flags.scope);
	if (flags.owner)
		filtered = filtered.filter((issue) => issue.owner === flags.owner);
	if (flags.tag)
		filtered = filtered.filter(
			(issue) => Array.isArray(issue.tags) && issue.tags.includes(flags.tag),
		);
	return filtered;
}

export function filteredIssues(flags: Record<string, string>): IssueRow[] {
	return filterIssueRows(
		walkIssues().map((path) => ({
			...readIssue(path).data,
			_path: path,
			_scope: scopeFromPath(path),
		})),
		flags,
	);
}

export function compareIssues(left: IssueRow, right: IssueRow): number {
	const priority = { P1: 1, P2: 2, P3: 3, P4: 4 } as const;
	const priorityOrder = priority[left.priority] - priority[right.priority];
	if (priorityOrder !== 0) return priorityOrder;

	const creationOrder = left.created_at.localeCompare(right.created_at);
	if (creationOrder !== 0) return creationOrder;

	return left.id.localeCompare(right.id);
}

function publicIssue(issue: IssueRow): IssueFrontmatter {
	const { _path, _scope, ...task } = issue;
	return task;
}

export async function cmdList(args: string[]) {
	const flags = parseFlags(args);
	const issues = filteredIssues(flags);

	const out = issues.map(publicIssue);

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

// ── task notes ───────────────────────────────────────────────────────────────

export interface ScoutedNote {
	task_id: string;
	task_path: string;
	task_status: IssueFrontmatter["status"];
	task_scope: string;
	note_id: string;
	kind: string;
	author: string;
	timestamp: string;
	content: string;
	claim?: string;
	run?: string;
}

function noteSummary(content: string): string {
	return content.replace(/\s+/g, " ").trim();
}

export async function cmdNotes(args: string[]) {
	const flags = parseFlags(args);
	const issues = filterIssueRows(
		filteredIssues({}),
		Object.fromEntries(
			Object.entries(flags).filter(
				([key]) => key === "status" || key === "scope",
			),
		),
	);
	const notes = issues
		.flatMap((issue): ScoutedNote[] => {
			const { body } = readIssue(issue._path);
			return parseStructuredTaskLogNotes(body).map((note) => ({
				task_id: issue.id,
				task_path: relPath(issue._path),
				task_status: issue.status,
				task_scope: issue._scope,
				note_id: note.id,
				kind: note.kind,
				author: note.author,
				timestamp: note.timestamp,
				content: note.content,
				...(note.attributes.claim ? { claim: note.attributes.claim } : {}),
				...(note.attributes.run ? { run: note.attributes.run } : {}),
			}));
		})
		.filter((note) => !flags.kind || note.kind === flags.kind)
		.filter((note) => !flags.author || note.author === flags.author)
		.sort(
			(left, right) =>
				left.task_path.localeCompare(right.task_path) ||
				left.timestamp.localeCompare(right.timestamp) ||
				left.note_id.localeCompare(right.note_id),
		);

	if (notes.length === 0) {
		console.log("No notes found.");
		return { notes };
	}

	console.log(`Notes (${notes.length})`);
	for (const note of notes) {
		console.log(
			`- ${note.kind} — ${note.task_id} (${note.task_scope}/${note.task_status}) — ${note.author} — ${note.timestamp}`,
		);
		console.log(`  ${note.task_path} · ${note.note_id}`);
		console.log(`  ${noteSummary(note.content) || "(empty)"}`);
	}
	return { notes };
}

// ── task next ─────────────────────────────────────────────────────────────────

export async function cmdNext(args: string[]) {
	const flags = parseFlags(args);
	const issues = filteredIssues({ status: "ready-for-agent", ...flags });
	const task = issues.toSorted(compareIssues)[0];

	if (!task) {
		console.log("No tasks available.");
		return { task: null };
	}

	console.log(`Next task: ${task.id} — ${task.title ?? task.id}`);
	return { task: publicIssue(task) };
}

// ── task take ────────────────────────────────────────────────────────────────

export async function cmdTake(args: string[]) {
	const flags = parseFlags(args);
	const agentId = flags.agent;
	const leaseMinutes = flags.lease ? Number(flags.lease) : NaN;
	if (!agentId || !Number.isInteger(leaseMinutes) || leaseMinutes <= 0) {
		die(
			"Usage: task take --agent <agent-id> --lease <minutes> [--status <status>] [--scope <scope>] [--owner <owner>] [--tag <tag>] [--worktree <path>] [--branch <branch>]",
		);
	}
	if (flags.run && !flags.role)
		die("Usage: task take --role <role> is required when --run is provided");
	if (flags.role?.match(/[\s=>]/) || flags.run?.match(/[\s=>]/))
		usageError("Take role and run must not contain whitespace, '=' or '>'.");

	return withTakeLock(agentId, async () => {
		// All task and assignment reads intentionally happen after lock acquisition.
		const assignments = readAssignments();
		const now = new Date();
		const expired = expireEligibleClaims(assignments, now);
		const expiredTaskIds = new Set(
			expired.map(({ assignment }) => assignment.task_id),
		);
		const { status = "ready-for-agent", role, run, ...selectionFlags } = flags;
		const candidates = filterIssueRows(
			filteredIssues({})
				.map((issue) =>
					expiredTaskIds.has(issue.id)
						? {
								...issue,
								status: "ready-for-agent" as const,
								owner: "human",
								owner_type: "human" as const,
								agent_id: null,
							}
						: issue,
				)
				.filter(
					(issue) =>
						issue.status === status ||
						(Boolean(role) && issue.status === "in-progress"),
				)
				.filter((issue) => {
					if (!role) return true;
					const issuePath = findIssueFile(issue.id);
					if (!issuePath) return false;
					const fixture = fixtureForTask(readIssue(issuePath).data);
					if (!fixture) return false;
					const selectedRole = roleForFixture(fixture, role);
					if (!selectedRole) return false;
					const activeSlots = new Set(
						assignments
							.filter(
								(assignment) =>
									assignment.task_id === issue.id &&
									assignment.status === "active" &&
									isParticipant(assignment) &&
									assignment.role === role,
							)
							.map((assignment) => assignment.slot),
					);
					return slotsForFixture(fixture).some(
						(slot) => slot.role === role && !activeSlots.has(slot.slot),
					);
				}),
			selectionFlags,
		).toSorted(compareIssues);
		const task = candidates[0];

		if (!task) {
			await commitExpiredClaims(
				assignments,
				expired,
				`take: expire ${expired.length} lease(s)`,
				now.toISOString(),
			);
			console.log("No tasks available.");
			return { task: null };
		}

		const owner = agentId;
		const issuePath = findIssueFile(task.id);
		const fixture =
			role && issuePath ? fixtureForTask(readIssue(issuePath).data) : null;
		const slot =
			fixture && role
				? (slotsForFixture(fixture).find(
						(candidate) =>
							candidate.role === role &&
							!assignments.some(
								(assignment) =>
									assignment.task_id === task.id &&
									assignment.status === "active" &&
									isParticipant(assignment) &&
									assignment.slot === candidate.slot,
							),
					)?.slot ?? null)
				: null;
		const assignment = await claimTask(
			task.id,
			{
				agentId,
				owner,
				ownerType: "agent",
				worktree: flags.worktree ?? null,
				branch: flags.branch ?? null,
				leaseMinutes,
				assignmentType: role ? "participant" : "primary",
				role: role ?? null,
				slot,
				runId: run ?? null,
			},
			assignments,
			expired,
			`take(${task.id}): ${owner}`,
		);
		const claimedIssuePath = findIssueFile(task.id);
		const claimedTask = claimedIssuePath
			? readIssue(claimedIssuePath).data
			: publicIssue(task);
		console.log(`Took '${task.id}' as '${owner}'`);
		return { task: claimedTask, assignment };
	});
}

// ── task slots ───────────────────────────────────────────────────────────────

type SlotState = "free" | "active" | "completed" | "expired";

interface SlotReport {
	role: string;
	slot: string;
	exclusive: boolean;
	state: SlotState;
	assignment: Assignment | null;
}

function stateForSlot(assignments: Assignment[]): {
	state: SlotState;
	assignment: Assignment | null;
} {
	const active = assignments.find(
		(assignment) => assignment.status === "active",
	);
	if (active) return { state: "active", assignment: active };
	const settled = assignments
		.filter(
			(assignment) =>
				assignment.status === "completed" || assignment.status === "expired",
		)
		.toSorted((left, right) =>
			(right.completed_at ?? right.claimed_at).localeCompare(
				left.completed_at ?? left.claimed_at,
			),
		)[0];
	if (!settled) return { state: "free", assignment: null };
	return { state: settled.status, assignment: settled };
}

function slotReports(
	data: IssueFrontmatter,
	assignments: Assignment[],
	runId: string | undefined,
): { fixture: string | null; slots: SlotReport[] } {
	const fixture = fixtureForTask(data);
	if (!fixture) {
		const primary = assignments.filter(
			(assignment) => !isParticipant(assignment),
		);
		const state = stateForSlot(primary);
		return {
			fixture: null,
			slots: [
				{
					role: "primary",
					slot: "primary-1",
					exclusive: true,
					...state,
				},
			],
		};
	}

	return {
		fixture: fixture.id,
		slots: slotsForFixture(fixture).map((slot) => {
			const matching = assignments.filter(
				(assignment) =>
					isParticipant(assignment) &&
					assignment.role === slot.role &&
					assignment.slot === slot.slot &&
					(runId === undefined || assignment.run_id === runId),
			);
			return { ...slot, ...stateForSlot(matching) };
		}),
	};
}

export async function cmdSlots(args: string[]) {
	const taskId = args[0];
	const flags = parseFlags(args.slice(1));
	if (!taskId || Object.keys(flags).some((flag) => flag !== "run"))
		die("Usage: task slots <task-id> [--run <run-id>]");
	if (flags.run?.match(/[\s=>]/))
		usageError("Slot run must not contain whitespace, '=' or '>'.");
	const issuePath = findIssueFile(taskId);
	if (!issuePath) die(`Issue not found for '${taskId}'`);
	const { data } = readIssue(issuePath);
	const result = {
		task_id: taskId,
		...slotReports(
			data,
			readAssignments().filter((assignment) => assignment.task_id === taskId),
			flags.run,
		),
	};

	console.log(
		`Slots for '${taskId}' (${result.fixture ?? "implicit primary"})`,
	);
	for (const slot of result.slots)
		console.log(
			`  ${slot.slot}: ${slot.state}${slot.assignment ? ` (${slot.assignment.owner})` : ""}`,
		);
	return result;
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
		assignmentHistory.find(
			(assignment) =>
				assignment.status === "active" && !isParticipant(assignment),
		) ?? null;
	const participantClaims = assignmentHistory.filter(isParticipant);
	const activeParticipants = participantClaims.filter(
		(assignment) => assignment.status === "active",
	);
	const taskLog = parsed.log ?? { commits: [], notes: [], history: [] };
	const taskLogMarkdown = parsed.log
		? body.slice(body.indexOf("## Task Log")).trim()
		: "";
	const result = {
		frontmatter,
		body: parsed.authoredBody,
		task_log: taskLog,
		task_log_markdown: taskLogMarkdown,
		task_log_errors: parsed.errors,
		path: relPath(issuePath),
		scope: scopeFromPath(issuePath),
		primary_assignment: primaryAssignment,
		has_active_assignment:
			primaryAssignment !== null || activeParticipants.length > 0,
		participant_claims: participantClaims,
		active_participants: activeParticipants,
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
	console.log(
		`Participant claims: ${activeParticipants.length} active, ${participantClaims.length} total`,
	);
	for (const participant of participantClaims)
		console.log(
			`  ${participant.status}: ${participant.owner} as ${participant.role} in ${participant.slot}${participant.run_id ? ` (run ${participant.run_id})` : ""}, claim ${participant.claim_id ?? "none"}, lease ${participant.lease_until ?? "none"}${participant.completed_at ? `, completed ${participant.completed_at}` : ""}${participant.outcome ? `, outcome ${participant.outcome}` : ""}${participant.note_id ? `, note ${participant.note_id}` : ""}`,
		);
	console.log(`Assignment history: ${assignmentHistory.length} record(s)`);
	for (const assignment of assignmentHistory)
		console.log(
			`  ${assignment.status}: ${assignment.owner} (${assignment.owner_type}), claimed ${assignment.claimed_at}${assignment.released_at ? `, released ${assignment.released_at}` : ""}`,
		);
	console.log("\nBody:");
	console.log(parsed.authoredBody.trim() || "(empty)");
	console.log("\nTask Log:");
	console.log(taskLogMarkdown || "(none)");
	console.log("\nTask Log summary:");
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
