#!/usr/bin/env bun
// vim: set filetype=typescript :

import { $ } from "bun";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "fs";
import { basename, dirname, isAbsolute, join, relative } from "path";
import { createInterface } from "readline";

const ROOT = import.meta.dir;

// ── Types ─────────────────────────────────────────────────────────────────────

interface IssueFrontmatter {
	id: string;
	title?: string;
	status:
		| "open"
		| "in-progress"
		| "done"
		| "blocked"
		| "needs-triage"
		| "needs-info"
		| "ready-for-agent"
		| "ready-for-human"
		| "wontfix";
	priority: "P1" | "P2" | "P3" | "P4";
	owner?: string;
	owner_type?: "human" | "agent";
	agent_id?: string | null;
	tags: string[];
	created_at: string;
	closed_at?: string | null;
	[key: string]: unknown;
}

interface Assignment {
	task_id: string;
	status: "active" | "released" | "expired";
	owner: string;
	owner_type: "human" | "agent";
	agent_id: string | null;
	worktree: string | null;
	branch: string | null;
	claimed_at: string;
	lease_until: string | null;
	released_at: string | null;
}

// ── YAML frontmatter ──────────────────────────────────────────────────────────

function parseFrontmatter(content: string): {
	data: Record<string, unknown>;
	body: string;
} {
	const lines = content.split("\n");
	if (lines[0] !== "---") return { data: {}, body: content };
	const endIdx = lines.indexOf("---", 1);
	if (endIdx === -1) return { data: {}, body: content };

	const data: Record<string, unknown> = {};
	const yamlLines = lines.slice(1, endIdx);
	let i = 0;

	while (i < yamlLines.length) {
		const line = yamlLines[i];
		const m = line.match(/^([\w_-]+)\s*:\s*(.*)/);
		if (!m) {
			i++;
			continue;
		}
		const [, key, rawVal] = m;
		const val = rawVal.trim();

		if (val === "") {
			// block sequence: collect "  - value" lines
			const items: string[] = [];
			i++;
			while (i < yamlLines.length && /^[ \t]/.test(yamlLines[i])) {
				const item = yamlLines[i].replace(/^\s*-\s*/, "").trim();
				if (item) items.push(item);
				i++;
			}
			data[key] = items;
			continue;
		}

		if (val === "null") data[key] = null;
		else if (val.startsWith("[")) {
			// inline array: [a, b, c]
			const inner = val.slice(1, val.lastIndexOf("]"));
			data[key] = inner
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else {
			data[key] = val;
		}
		i++;
	}

	return { data, body: lines.slice(endIdx + 1).join("\n") };
}

function serializeFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ["---"];
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) lines.push(`${key}: [${value.join(", ")}]`);
		else if (value === null) lines.push(`${key}: null`);
		else lines.push(`${key}: ${value}`);
	}
	lines.push("---");
	return lines.join("\n");
}

// ── assignments.yaml ──────────────────────────────────────────────────────────

const ASSIGNMENTS_PATH = join(ROOT, "assignments.yaml");

function readAssignments(): Assignment[] {
	if (!existsSync(ASSIGNMENTS_PATH)) return [];
	return parseAssignmentsYaml(readFileSync(ASSIGNMENTS_PATH, "utf-8"));
}

function parseAssignmentsYaml(content: string): Assignment[] {
	const lines = content.split("\n");
	const records: Assignment[] = [];
	let cur: Record<string, string | null> | null = null;

	for (const line of lines) {
		if (line.startsWith("- ")) {
			if (cur) records.push(toAssignment(cur));
			cur = {};
			const m = line.slice(2).match(/^([\w_-]+)\s*:\s*(.*)/);
			if (m) cur[m[1]] = m[2].trim() === "null" ? null : m[2].trim();
		} else if (/^  [\w_-]/.test(line) && cur) {
			const m = line.match(/^  ([\w_-]+)\s*:\s*(.*)/);
			if (m) cur[m[1]] = m[2].trim() === "null" ? null : m[2].trim();
		}
	}
	if (cur) records.push(toAssignment(cur));
	return records;
}

function toAssignment(r: Record<string, string | null>): Assignment {
	return {
		task_id: r.task_id ?? "",
		status: (r.status ?? "active") as Assignment["status"],
		owner: r.owner ?? "",
		owner_type: (r.owner_type ?? "human") as Assignment["owner_type"],
		agent_id: r.agent_id ?? null,
		worktree: r.worktree ?? null,
		branch: r.branch ?? null,
		claimed_at: r.claimed_at ?? new Date().toISOString(),
		lease_until: r.lease_until ?? null,
		released_at: r.released_at ?? null,
	};
}

const ASSIGNMENT_KEYS: (keyof Assignment)[] = [
	"task_id",
	"status",
	"owner",
	"owner_type",
	"agent_id",
	"worktree",
	"branch",
	"claimed_at",
	"lease_until",
	"released_at",
];

function serializeAssignments(records: Assignment[]): string {
	if (records.length === 0) return "";
	const v = (x: unknown) => (x === null ? "null" : String(x));
	return (
		records
			.map((r) => {
				const [first, ...rest] = ASSIGNMENT_KEYS;
				return (
					`- ${first}: ${v(r[first])}\n` +
					rest.map((k) => `  ${k}: ${v(r[k])}`).join("\n")
				);
			})
			.join("\n") + "\n"
	);
}

function writeAssignments(records: Assignment[]): void {
	writeFileSync(ASSIGNMENTS_PATH, serializeAssignments(records));
}

// ── Issue file helpers ────────────────────────────────────────────────────────

function walkIssues(): string[] {
	const issuesDir = join(ROOT, "issues");
	const results: string[] = [];
	function walk(dir: string) {
		for (const entry of readdirSync(dir)) {
			if (entry === "templates") continue;
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (
				entry.endsWith(".md") &&
				entry !== "backlog.md" &&
				entry !== "assignments.md" &&
				!/^\d{4}-\d{2}-\d{2}\.md$/.test(entry)
			)
				results.push(full);
		}
	}
	if (existsSync(issuesDir)) walk(issuesDir);
	return results;
}

function findIssueFile(taskId: string): string | null {
	return (
		walkIssues().find((p) => {
			const slug = basename(p, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
			return slug === taskId;
		}) ?? null
	);
}

function readIssue(filePath: string): { data: IssueFrontmatter; body: string } {
	const { data, body } = parseFrontmatter(readFileSync(filePath, "utf-8"));
	return { data: data as IssueFrontmatter, body };
}

function writeIssue(
	filePath: string,
	data: IssueFrontmatter,
	body: string,
): void {
	writeFileSync(
		filePath,
		serializeFrontmatter(data as unknown as Record<string, unknown>) +
			"\n" +
			body,
	);
}

function scopeFromPath(filePath: string): string {
	return relative(join(ROOT, "issues"), filePath).split("/")[0];
}

function slugFromTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

function relPath(absPath: string): string {
	return relative(ROOT, absPath);
}

function gitPath(filePath: string): string {
	const rel = isAbsolute(filePath) ? relative(ROOT, filePath) : filePath;
	if (rel === "" || rel.startsWith("..")) {
		die(`Refusing to stage path outside task root: ${filePath}`);
	}
	return rel;
}

interface FileSnapshot {
	path: string;
	existed: boolean;
	content: string | null;
}

function snapshotFiles(paths: string[]): FileSnapshot[] {
	const seen = new Set<string>();
	return paths
		.filter((path) => {
			if (seen.has(path)) return false;
			seen.add(path);
			return true;
		})
		.map((path) => ({
			path,
			existed: existsSync(path),
			content: existsSync(path) ? readFileSync(path, "utf-8") : null,
		}));
}

function restoreFiles(snapshots: FileSnapshot[]): void {
	for (const snapshot of snapshots) {
		if (snapshot.existed) {
			writeFileSync(snapshot.path, snapshot.content ?? "");
		} else if (existsSync(snapshot.path)) {
			rmSync(snapshot.path, { force: true });
		}
	}
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

async function gitAdd(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const relPaths = paths.map(gitPath);
	await $`git -C ${ROOT} add -f -- ${relPaths}`;
}

async function gitAddUpdate(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const relPaths = paths.map(gitPath);
	await $`git -C ${ROOT} add -u -- ${relPaths}`;
}

async function gitCommit(message: string): Promise<boolean> {
	const staged = (
		await $`git -C ${ROOT} diff --cached --name-only`.text()
	).trim();
	if (!staged) {
		console.warn("No staged task changes; skipping commit.");
		return false;
	}
	await $`git -C ${ROOT} commit -m ${message}`;
	return true;
}

async function commitWithRollback(
	message: string,
	touchedPaths: string[],
	mutate: () => Promise<void> | void,
): Promise<boolean> {
	const snapshots = snapshotFiles(touchedPaths);
	try {
		await mutate();
		return await gitCommit(message);
	} catch (error) {
		restoreFiles(snapshots);
		try {
			const relPaths = touchedPaths.map(gitPath);
			await $`git -C ${ROOT} restore --staged -- ${relPaths}`;
		} catch {
			/* best-effort cleanup of failed staging */
		}
		console.error("Task state was restored after git staging/commit failed.");
		throw error;
	}
}

// ── flow.md helpers ───────────────────────────────────────────────────────────

const FLOW_PATH = join(ROOT, "flow.md");

function readFlow(): string {
	return readFileSync(FLOW_PATH, "utf-8");
}
function writeFlow(content: string): void {
	writeFileSync(FLOW_PATH, content);
}

function headerLevel(header: string): number {
	return (header.match(/^(#+)/) ?? ["", "##"])[1].length;
}

function replaceSection(
	content: string,
	header: string,
	newBody: string,
): string {
	const lines = content.split("\n");
	const level = headerLevel(header);
	const startIdx = lines.findIndex((l) => l === header);
	if (startIdx === -1) return content;

	let endIdx = lines.length;
	for (let i = startIdx + 1; i < lines.length; i++) {
		const m = lines[i].match(/^(#+)/);
		if (m && m[1].length <= level) {
			endIdx = i;
			break;
		}
	}

	const trimmed = newBody.trim();
	const body = trimmed ? `\n${trimmed}\n\n` : "\n";
	return (
		lines.slice(0, startIdx + 1).join("\n") +
		body +
		lines.slice(endIdx).join("\n")
	);
}

function extractSection(content: string, header: string): string {
	const lines = content.split("\n");
	const level = headerLevel(header);
	const startIdx = lines.findIndex((l) => l === header);
	if (startIdx === -1) return "";

	let endIdx = lines.length;
	for (let i = startIdx + 1; i < lines.length; i++) {
		const m = lines[i].match(/^(#+)/);
		if (m && m[1].length <= level) {
			endIdx = i;
			break;
		}
	}

	return lines
		.slice(startIdx + 1, endIdx)
		.join("\n")
		.trim();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function die(msg: string): never {
	console.error(msg);
	process.exit(1);
}

function parseFlags(args: string[]): Record<string, string> {
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

function parseTemplateArg(args: string[]): {
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

function resolveIssueTemplate(templateName: string): string {
	const templatePath = join(
		ROOT,
		"issues",
		"templates",
		`${templateName}.md`,
	);
	if (!existsSync(templatePath)) {
		die(`Template not found: ${relPath(templatePath)}`);
	}

	return readFileSync(templatePath, "utf-8");
}

async function prompt(question: string): Promise<string> {
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

async function cmdLint() {
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
		const taskLines = lines.filter((l) => /^- \[[ x\-\*]\]/.test(l));
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
		console.error(`Failed: ${errors} error(s), ${warnings} warning(s).`);
		process.exit(1);
	}
}

// ── task new ──────────────────────────────────────────────────────────────────

async function cmdNew(args: string[]) {
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

	writeFileSync(filePath, serializeFrontmatter(fm) + "\n" + templateBody);
	console.log(relPath(filePath));
}

// ── task claim ────────────────────────────────────────────────────────────────

async function cmdClaim(args: string[]) {
	const taskId = args[0];
	if (!taskId)
		die(
			"Usage: task claim <task-id> [--owner <name>] [--agent <id>] [--worktree <path>] [--branch <branch>] [--lease <minutes>]",
		);

	const flags = parseFlags(args.slice(1));
	const agentId = flags["agent"] ?? null;
	const owner = flags["owner"] ?? (agentId ? agentId : "human");
	const worktree = flags["worktree"] ?? null;
	const branch = flags["branch"] ?? null;
	const leaseMinutes = flags["lease"] ? parseInt(flags["lease"]) : null;
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
				writeIssue(issuePath, data, body);
			}

			await cmdRender();
			await gitAdd(changedFiles);
		},
	);
	console.log(`Claimed '${taskId}' by '${owner}'`);
}

// ── task triage ───────────────────────────────────────────────────────────────

async function cmdTriage(args: string[]) {
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
}

// ── task release ──────────────────────────────────────────────────────────────

async function cmdRelease(args: string[]) {
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
			writeIssue(issuePath, data, body);
		}

		await cmdRender();
		await gitAdd(changedFiles);
	});
	console.log(`Released '${taskId}'`);
}

// ── task close ────────────────────────────────────────────────────────────────

async function cmdClose(args: string[]) {
	const taskId = args[0];
	const flags = parseFlags(args.slice(1));
	const wontfix = "wontfix" in flags;
	if (!taskId) die("Usage: task close <task-id> [--wontfix]");

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

	await commitWithRollback(
		`close(${taskId})`,
		[issuePath, newPath, FLOW_PATH, ASSIGNMENTS_PATH],
		async () => {
			writeIssue(issuePath, data, body);
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
}

// ── task doctor ───────────────────────────────────────────────────────────────

async function cmdDoctor() {
	const assignments = readAssignments();
	const now = new Date();
	let mutated = false;

	for (const a of assignments) {
		if (
			a.status === "active" &&
			a.lease_until &&
			new Date(a.lease_until) < now
		) {
			a.status = "expired";
			console.warn(`EXPIRED: ${a.task_id} (lease was ${a.lease_until})`);
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
			console.warn(
				`WARN: ${relPath(p)} is in-progress but has no active assignment`,
			);
		}
		if (data.status === "needs-triage" && !data.owner) {
			const createdAt = new Date(String(data.created_at ?? ""));
			const ageDays = Number.isFinite(createdAt.getTime())
				? Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000)
				: NaN;
			if (Number.isFinite(ageDays) && ageDays > 7) {
				console.warn(
					`WARN: ${relPath(p)} is needs-triage for ${ageDays} days with no owner`,
				);
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
			console.warn(
				`WARN: active assignment for '${a.task_id}' has no issue file`,
			);
		}
	}

	// flow.md Active entries not backed by active assignment
	const flow = readFlow();
	const activeSection = extractSection(flow, "### Active");
	for (const m of activeSection.matchAll(/\(id:([a-z0-9][a-z0-9-]*)\)/g)) {
		if (!activeIds.has(m[1])) {
			console.warn(
				`WARN: flow.md Active entry '${m[1]}' has no active assignment`,
			);
		}
	}

	console.log("Doctor check complete.");
}

// ── task render ───────────────────────────────────────────────────────────────

async function cmdRender() {
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
}

// ── task list ─────────────────────────────────────────────────────────────────

async function cmdList(args: string[]) {
	const flags = parseFlags(args);
	const jsonOutput = "json" in flags;

	type IssueRow = IssueFrontmatter & { _path: string; _scope: string };
	let issues: IssueRow[] = walkIssues().map((p) => ({
		...readIssue(p).data,
		_path: p,
		_scope: scopeFromPath(p),
	}));

	if (flags["status"])
		issues = issues.filter((i) => i.status === flags["status"]);
	if (flags["scope"])
		issues = issues.filter((i) => i._scope === flags["scope"]);
	if (flags["owner"]) issues = issues.filter((i) => i.owner === flags["owner"]);
	if (flags["tag"])
		issues = issues.filter(
			(i) => Array.isArray(i.tags) && i.tags.includes(flags["tag"]),
		);

	if (jsonOutput) {
		const out = issues.map(({ _path, _scope, ...rest }) => rest);
		console.log(JSON.stringify(out, null, 2));
		return;
	}

	if (issues.length === 0) {
		console.log("No issues found.");
		return;
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
}

// ── AI backends ───────────────────────────────────────────────────────────────

interface IngestResult {
	type: string;
	scope?: string;
	slug?: string;
	title?: string;
	markdown?: string;
	clarification?: string;
}

// CLI tools that accept a prompt via flag and print to stdout.
// codex uses a subcommand instead of a flag.
const CLI_BACKENDS: Record<
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

async function detectBackend(): Promise<string> {
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
function extractJSON(text: string): string {
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

async function callAI(
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
			die(`Anthropic API error ${response.status}: ${text}`);
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

async function cmdIngest(args: string[]) {
	const { templateName } = parseTemplateArg(args);
	const flags = parseFlags(args);
	const apiKey = process.env.ANTHROPIC_API_KEY;
	const template = resolveIssueTemplate(templateName);

	// Resolve backend: explicit flag > auto-detect
	let backend = flags["backend"] ?? "";
	if (!backend) {
		backend = await detectBackend();
		console.log(`Using backend: ${backend}`);
	}

	if (backend === "api" && !apiKey) {
		console.error(
			"ERROR: ANTHROPIC_API_KEY is not set (required for --backend api)",
		);
		process.exit(1);
	}

	const flow = readFlow();
	const scratchpad = extractSection(flow, "## Issue Scratchpad");
	const bullets = scratchpad.split("\n").filter((l) => /^\s*[-*]/.test(l));

	if (bullets.length === 0) {
		console.log("Issue Scratchpad is empty.");
		return;
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
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

const HELP = `task — file-based task orchestration

Commands:
  lint                      Validate task system invariants
  new <scope> <title>       Create a new issue from template
    --template <name>       Use issues/templates/<name>.md (default: issue)
  claim <task-id>           Claim a task
    --owner <name>          Owner name
    --agent <agent-id>      Marks as agent (requires --lease)
    --worktree <path>       Worktree path
    --branch <name>         Branch name
    --lease <minutes>       Lease duration (required for agents)
  triage <task-id> <status> Update issue triage status
  release <task-id>         Release a task back to open
    --reason <note>         Optional reason
  close <task-id>           Mark done and archive
    --wontfix              Archive as wontfix instead of done
  doctor                    Expire stale leases, warn on drift
  render                    Rebuild flow.md Active / Agent Queue
  list                      List issues (filterable)
    --status <s>            Filter by status
    --scope <s>             Filter by scope
    --owner <s>             Filter by owner
    --tag <t>               Filter by tag
    --json                  JSON output
  ingest                    Process Issue Scratchpad via AI
    --backend <name>        Force backend: gemini, claude, copilot, codex, api
                            (default: auto-detect from PATH, fallback to api)
    --template <name>       Use issues/templates/<name>.md (default: issue)
`;

const [, , cmd, ...rest] = process.argv;

switch (cmd) {
	case "lint":
		await cmdLint();
		break;
	case "new":
		await cmdNew(rest);
		break;
	case "claim":
		await cmdClaim(rest);
		break;
	case "triage":
		await cmdTriage(rest);
		break;
	case "release":
		await cmdRelease(rest);
		break;
	case "close":
		await cmdClose(rest);
		break;
	case "doctor":
		await cmdDoctor();
		break;
	case "render":
		await cmdRender();
		break;
	case "list":
		await cmdList(rest);
		break;
	case "ingest":
		await cmdIngest(rest);
		break;
	case "help":
	case undefined:
		console.log(HELP);
		break;
	default:
		console.error(`Unknown command: ${cmd}`);
		console.log(HELP);
		process.exit(1);
}
