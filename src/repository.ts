import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, relative } from "node:path";
import { $ } from "bun";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";
import { ROOT } from "./runtime";
import type { Assignment, IssueFrontmatter } from "./types";

// ── assignments.yaml ──────────────────────────────────────────────────────────

export const ASSIGNMENTS_PATH = join(ROOT, "assignments.yaml");

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
	"claimed_at",
	"lease_until",
	"released_at",
];

export function serializeAssignments(records: Assignment[]): string {
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
		walkIssues().find((p) => {
			const slug = basename(p, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
			return slug === taskId;
		}) ?? null
	);
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
	await $`git -C ${ROOT} commit -m ${message}`;
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

export function extractSection(content: string, header: string): string {
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
