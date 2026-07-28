import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, relative } from "node:path";
import { $ } from "bun";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";
import { isJsonMode, operationalError } from "./protocol";
import { ROOT } from "./runtime";
import type { Assignment, IssueFrontmatter } from "./types";

// ── assignments.yaml ──────────────────────────────────────────────────────────

export const ASSIGNMENTS_PATH = join(ROOT, "assignments.yaml");

// ── local take lock ─────────────────────────────────────────────────────────

export const TAKE_LOCK_PATH = join(ROOT, ".docket-take.lock");
const TAKE_LOCK_METADATA_PATH = join(TAKE_LOCK_PATH, "owner.json");
const TAKE_LOCK_STALE_MS = 5 * 60_000;

interface TakeLockMetadata {
	pid: number;
	agent: string;
	created_at: string;
	token: string;
}

function readTakeLockMetadata(): TakeLockMetadata | null {
	try {
		return JSON.parse(
			readFileSync(TAKE_LOCK_METADATA_PATH, "utf-8"),
		) as TakeLockMetadata;
	} catch {
		return null;
	}
}

function takeLockAgeMs(metadata: TakeLockMetadata | null): number {
	const createdAt = metadata ? new Date(metadata.created_at).getTime() : NaN;
	if (Number.isFinite(createdAt)) return Math.max(0, Date.now() - createdAt);
	return Math.max(0, Date.now() - statSync(TAKE_LOCK_PATH).mtimeMs);
}

function processIsAlive(pid: number | undefined): boolean {
	if (!pid || !Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}

function takeLockDetails(metadata: TakeLockMetadata | null, ageMs: number) {
	return {
		path: relPath(TAKE_LOCK_PATH),
		owner: metadata?.agent ?? "unknown",
		pid: metadata?.pid ?? null,
		age_ms: Math.floor(ageMs),
	};
}

function takeLockMessage(
	metadata: TakeLockMetadata | null,
	ageMs: number,
): string {
	const owner = metadata
		? `${metadata.agent} (pid ${metadata.pid})`
		: "an unknown process";
	return `Task acquisition is locked by ${owner}; lock age is ${Math.ceil(ageMs / 1000)}s at ${relPath(TAKE_LOCK_PATH)}. Wait for it to finish, or inspect the lock if it is abandoned.`;
}

function newTakeLockMetadata(agent: string): TakeLockMetadata {
	return {
		pid: process.pid,
		agent,
		created_at: new Date().toISOString(),
		token: crypto.randomUUID(),
	};
}

function writeTakeLockMetadata(metadata: TakeLockMetadata): void {
	writeFileSync(TAKE_LOCK_METADATA_PATH, `${JSON.stringify(metadata)}\n`);
}

function createTakeLock(agent: string): TakeLockMetadata {
	mkdirSync(TAKE_LOCK_PATH);
	const metadata = newTakeLockMetadata(agent);
	try {
		writeTakeLockMetadata(metadata);
		return metadata;
	} catch (error) {
		rmSync(TAKE_LOCK_PATH, { recursive: true, force: true });
		throw error;
	}
}

function acquireTakeLock(agent: string): TakeLockMetadata {
	try {
		return createTakeLock(agent);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
	}

	const metadata = readTakeLockMetadata();
	let ageMs: number;
	try {
		ageMs = takeLockAgeMs(metadata);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return acquireTakeLock(agent);
		}
		throw error;
	}
	if (ageMs < TAKE_LOCK_STALE_MS || processIsAlive(metadata?.pid)) {
		operationalError(
			takeLockMessage(metadata, ageMs),
			"TAKE_LOCK_HELD",
			takeLockDetails(metadata, ageMs),
		);
	}

	const stalePath = join(
		ROOT,
		`.docket-take.lock.stale-${process.pid}-${crypto.randomUUID()}`,
	);
	try {
		renameSync(TAKE_LOCK_PATH, stalePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return acquireTakeLock(agent);
		}
		throw error;
	}
	rmSync(stalePath, { recursive: true, force: true });
	try {
		const replacement = createTakeLock(agent);
		console.warn(
			`Recovered stale task acquisition lock at ${relPath(TAKE_LOCK_PATH)} (owner ${metadata?.agent ?? "unknown"}, age ${Math.ceil(ageMs / 1000)}s).`,
		);
		return replacement;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") {
			const current = readTakeLockMetadata();
			const currentAge = takeLockAgeMs(current);
			operationalError(
				takeLockMessage(current, currentAge),
				"TAKE_LOCK_HELD",
				takeLockDetails(current, currentAge),
			);
		}
		throw error;
	}
}

export async function withTakeLock<T>(
	agent: string,
	action: () => Promise<T>,
): Promise<T> {
	const lock = acquireTakeLock(agent);
	try {
		return await action();
	} finally {
		if (readTakeLockMetadata()?.token === lock.token) {
			rmSync(TAKE_LOCK_PATH, { recursive: true, force: true });
		}
	}
}

export function readAssignments(): Assignment[] {
	if (!existsSync(ASSIGNMENTS_PATH)) return [];
	return parseAssignmentsYaml(readFileSync(ASSIGNMENTS_PATH, "utf-8"));
}

export function parseAssignmentsYaml(content: string): Assignment[] {
	const lines = content.split("\n");
	const records: Assignment[] = [];
	let cur: Record<string, string | null> | null = null;

	for (const line of lines) {
		if (line.startsWith("- ")) {
			if (cur) records.push(toAssignment(cur));
			cur = {};
			const m = line.slice(2).match(/^([\w_-]+)\s*:\s*(.*)/);
			if (m) cur[m[1]] = m[2].trim() === "null" ? null : m[2].trim();
		} else if (/^ {2}[\w_-]/.test(line) && cur) {
			const m = line.match(/^ {2}([\w_-]+)\s*:\s*(.*)/);
			if (m) cur[m[1]] = m[2].trim() === "null" ? null : m[2].trim();
		}
	}
	if (cur) records.push(toAssignment(cur));
	return records;
}

export function toAssignment(r: Record<string, string | null>): Assignment {
	return {
		task_id: r.task_id ?? "",
		status: (r.status ?? "active") as Assignment["status"],
		owner: r.owner ?? "",
		owner_type: (r.owner_type ?? "human") as Assignment["owner_type"],
		agent_id: r.agent_id ?? null,
		worktree: r.worktree ?? null,
		branch: r.branch ?? null,
		claim_id: r.claim_id ?? null,
		base_commit: r.base_commit ?? null,
		claimed_at: r.claimed_at ?? new Date().toISOString(),
		lease_until: r.lease_until ?? null,
		released_at: r.released_at ?? null,
	};
}

export const ASSIGNMENT_KEYS: (keyof Assignment)[] = [
	"task_id",
	"status",
	"owner",
	"owner_type",
	"agent_id",
	"worktree",
	"branch",
	"claim_id",
	"claimed_at",
	"lease_until",
	"released_at",
];

export function serializeAssignments(records: Assignment[]): string {
	if (records.length === 0) return "";
	const v = (x: unknown) => (x === null ? "null" : String(x));
	return `${records
		.map((r) => {
			const [first, ...rest] = ASSIGNMENT_KEYS;
			const keys = [
				...rest
					.slice(0, rest.indexOf("claimed_at"))
					.filter((key) => key !== "claim_id"),
				...(r.claim_id ? (["claim_id"] as const) : []),
				...(r.base_commit ? (["base_commit"] as const) : []),
				...rest.slice(rest.indexOf("claimed_at")),
			];
			return (
				`- ${first}: ${v(r[first])}\n` +
				keys.map((k) => `  ${k}: ${v(r[k])}`).join("\n")
			);
		})
		.join("\n")}\n`;
}

export function writeAssignments(records: Assignment[]): void {
	writeFileSync(ASSIGNMENTS_PATH, serializeAssignments(records));
}

// ── Issue file helpers ────────────────────────────────────────────────────────

export function walkIssues(): string[] {
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

export function findIssueFile(taskId: string): string | null {
	return (
		walkIssues().find((path) => {
			const slug = basename(path, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
			return slug === taskId;
		}) ?? null
	);
}

export function findIssueFiles(taskId: string): string[] {
	return walkIssues()
		.filter((p) => {
			const slug = basename(p, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
			return slug === taskId;
		})
		.sort((left, right) => relPath(left).localeCompare(relPath(right)));
}

export function readIssue(filePath: string): {
	data: IssueFrontmatter;
	body: string;
} {
	const { data, body } = parseFrontmatter(readFileSync(filePath, "utf-8"));
	return { data: data as IssueFrontmatter, body };
}

export function writeIssue(
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

export function scopeFromPath(filePath: string): string {
	return relative(join(ROOT, "issues"), filePath).split("/")[0];
}

export function slugFromTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

export function relPath(absPath: string): string {
	return relative(ROOT, absPath);
}

export function gitPath(filePath: string): string {
	const rel = isAbsolute(filePath) ? relative(ROOT, filePath) : filePath;
	if (rel === "" || rel.startsWith("..")) {
		die(`Refusing to stage path outside task root: ${filePath}`);
	}
	return rel;
}

export interface FileSnapshot {
	path: string;
	existed: boolean;
	content: string | null;
}

export function snapshotFiles(paths: string[]): FileSnapshot[] {
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

export function restoreFiles(snapshots: FileSnapshot[]): void {
	for (const snapshot of snapshots) {
		if (snapshot.existed) {
			writeFileSync(snapshot.path, snapshot.content ?? "");
		} else if (existsSync(snapshot.path)) {
			rmSync(snapshot.path, { force: true });
		}
	}
}

export function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function gitAdd(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const relPaths = paths.map(gitPath);
	await $`git -C ${ROOT} add -f -- ${relPaths}`;
}

export async function gitAddUpdate(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const relPaths = paths.map(gitPath);
	await $`git -C ${ROOT} add -u -- ${relPaths}`;
}

export async function gitCommit(message: string): Promise<boolean> {
	const staged = (
		await $`git -C ${ROOT} diff --cached --name-only`.text()
	).trim();
	if (!staged) {
		console.warn("No staged task changes; skipping commit.");
		return false;
	}
	const commit = $`git -C ${ROOT} commit -m ${message}`;
	if (isJsonMode()) commit.quiet();
	await commit;
	return true;
}

export async function commitWithRollback(
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

export const FLOW_PATH = join(ROOT, "flow.md");

export function readFlow(): string {
	return readFileSync(FLOW_PATH, "utf-8");
}
export function writeFlow(content: string): void {
	writeFileSync(FLOW_PATH, content);
}

export function headerLevel(header: string): number {
	return (header.match(/^(#+)/) ?? ["", "##"])[1].length;
}

export function replaceSection(
	content: string,
	header: string,
	newBody: string,
): string {
	const lines = content.split("\n");
	const level = headerLevel(header);
	const startIdx = lines.indexOf(header);
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

export function extractSection(content: string, header: string): string {
	const lines = content.split("\n");
	const level = headerLevel(header);
	const startIdx = lines.indexOf(header);
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
