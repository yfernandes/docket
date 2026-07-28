import { describe, expect, test } from "bun:test";
import {
	chmodSync,
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { HELP } from "../src/cli";
import { appendNote } from "../src/task-log";

const root = join(import.meta.dir, "..");

const FLOW = `# Flow

## Today

### Planned

### Active

### Completed

### Deferred

## Agent Queue

## Issue Scratchpad

## Meeting Notes

## Notes
`;

const LEGACY_TASK = `---
id: legacy-task
title: Legacy task
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2025-01-02
closed_at: null
---

## Context

This installation predates Task Log support.
`;

const LEGACY_ASSIGNED_TASK = `---
id: legacy-assigned
title: Legacy assigned task
status: in-progress
priority: P2
owner: yago
owner_type: human
agent_id: null
tags: [automation]
created_at: 2025-01-02
closed_at: null
---

## Context

Existing human assignment.
`;

const LEGACY_ASSIGNMENTS = `- task_id: legacy-assigned
  status: active
  owner: yago
  owner_type: human
  agent_id: null
  worktree: null
  branch: null
  claimed_at: 2025-01-02T10:00:00.000Z
  lease_until: null
  released_at: null
`;

const TASK_WITH_LOG = `---
id: task-with-log
title: Task with complete context
status: in-progress
priority: P1
owner: codex
owner_type: agent
agent_id: codex
tags: [automation, context]
created_at: 2025-01-03
closed_at: null
---

## Context

Keep this authored body exactly.

## Task Log

<!-- docket:task-log:start -->

### Commits

- \`bbb222\` Second commit in file
- \`aaa111\` First hash alphabetically

### Implementation Notes

#### 2025-01-03 10:30 UTC — decision — codex

<!-- docket:note id=note-second kind=decision -->

Keep the parser output in file order.

#### 2025-01-03 10:00 UTC — blocker — codex

<!-- docket:note id=note-first kind=blocker -->

This identifier sorts before the previous note.

### History

- 2025-01-03T11:00:00.000Z — second event
<!-- docket:event id=event-second -->

- 2025-01-03T09:00:00.000Z — first event
<!-- docket:event id=event-first -->

<!-- docket:task-log:end -->
`;

const TASK_WITH_LOG_ASSIGNMENTS = `- task_id: task-with-log
  status: released
  owner: first-owner
  owner_type: human
  agent_id: null
  worktree: null
  branch: null
  claimed_at: 2025-01-03T08:00:00.000Z
  lease_until: null
  released_at: 2025-01-03T08:30:00.000Z
- task_id: task-with-log
  status: active
  owner: codex
  owner_type: agent
  agent_id: codex
  worktree: /tmp/task-with-log
  branch: task-with-log
  claimed_at: 2025-01-03T09:00:00.000Z
  lease_until: 2025-01-03T12:00:00.000Z
  released_at: null
`;

const ISSUE_TEMPLATE = `---
id: replace-me
title: Replace me
status: needs-triage
priority: P2
tags: []
created_at: 2025-01-01
---

## Acceptance Criteria

- [ ] Define completion
`;

function run(
	fixture: string,
	entrypoint: "source" | "bundled",
	args: string[],
	stdin?: string,
): { exitCode: number; stdout: string; stderr: string } {
	const command =
		entrypoint === "source"
			? ["bun", "src/cli.ts", ...args]
			: ["bun", "task", ...args];
	const result = Bun.spawnSync(command, {
		cwd: fixture,
		...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
	});
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

async function runAsync(
	fixture: string,
	entrypoint: "source" | "bundled",
	args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const command =
		entrypoint === "source"
			? ["bun", "src/cli.ts", ...args]
			: ["bun", "task", ...args];
	const process = Bun.spawn(command, {
		cwd: fixture,
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await process.exited;
	return {
		exitCode,
		stdout: await new Response(process.stdout).text(),
		stderr: await new Response(process.stderr).text(),
	};
}

async function waitForPath(path: string): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		if (existsSync(path)) return;
		await Bun.sleep(10);
	}
	throw new Error(`Timed out waiting for ${path}`);
}

function createLegacyFixture(): string {
	const fixture = mkdtempSync(join(tmpdir(), "docket-legacy-"));
	mkdirSync(join(fixture, "issues", "automation"), { recursive: true });
	mkdirSync(join(fixture, "issues", "templates"), { recursive: true });
	mkdirSync(join(fixture, "src"), { recursive: true });
	mkdirSync(join(fixture, "fixtures"), { recursive: true });
	for (const file of [
		"cli.ts",
		"commands.ts",
		"config.ts",
		"frontmatter.ts",
		"fixtures.ts",
		"protocol.ts",
		"repository.ts",
		"runtime.ts",
		"task-log.ts",
		"types.ts",
	]) {
		copyFileSync(join(root, "src", file), join(fixture, "src", file));
	}
	copyFileSync(join(root, "task"), join(fixture, "task"));
	copyFileSync(
		join(root, "fixtures", "adversarial-review.json"),
		join(fixture, "fixtures", "adversarial-review.json"),
	);
	writeFileSync(join(fixture, "flow.md"), FLOW);
	writeFileSync(
		join(fixture, "issues", "templates", "issue.md"),
		ISSUE_TEMPLATE,
	);
	writeFileSync(join(fixture, "assignments.yaml"), LEGACY_ASSIGNMENTS);
	writeFileSync(
		join(fixture, "issues", "automation", "legacy-task.md"),
		LEGACY_TASK,
	);
	writeFileSync(
		join(fixture, "issues", "automation", "legacy-assigned.md"),
		LEGACY_ASSIGNED_TASK,
	);

	const init = Bun.spawnSync(["git", "init", "-q"], { cwd: fixture });
	expect(init.exitCode).toBe(0);
	const config = Bun.spawnSync(
		["git", "config", "user.email", "compat@example.test"],
		{ cwd: fixture },
	);
	expect(config.exitCode).toBe(0);
	const name = Bun.spawnSync(["git", "config", "user.name", "Compatibility"], {
		cwd: fixture,
	});
	expect(name.exitCode).toBe(0);
	const add = Bun.spawnSync(["git", "add", "."], { cwd: fixture });
	expect(add.exitCode).toBe(0);
	const commit = Bun.spawnSync(["git", "commit", "-qm", "legacy fixture"], {
		cwd: fixture,
	});
	expect(commit.exitCode).toBe(0);
	return fixture;
}

interface JsonResult {
	protocol_version: number;
	ok: boolean;
	command: string;
	data: Record<string, unknown>;
	warnings: string[];
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}

function jsonResult(result: ReturnType<typeof run>): JsonResult {
	expect(result.stdout.trim().startsWith("{")).toBe(true);
	expect(result.stdout.trim().endsWith("}")).toBe(true);
	expect(result.stdout).not.toContain("\u001b[");
	return JSON.parse(result.stdout) as JsonResult;
}

function withFixture(assertion: (fixture: string) => void): void {
	const fixture = createLegacyFixture();
	try {
		assertion(fixture);
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
}

function selectAdversarialReviewFixture(fixture: string): void {
	const issuePath = join(fixture, "issues", "automation", "legacy-task.md");
	writeFileSync(
		issuePath,
		readFileSync(issuePath, "utf-8").replace(
			"closed_at: null",
			"fixture: adversarial-review\nclosed_at: null",
		),
	);
}

function commitIn(directory: string, message: string): string {
	expect(Bun.spawnSync(["git", "add", "."], { cwd: directory }).exitCode).toBe(
		0,
	);
	expect(
		Bun.spawnSync(["git", "commit", "-qm", message], { cwd: directory })
			.exitCode,
	).toBe(0);
	return Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: directory })
		.stdout.toString()
		.trim();
}

function createApplicationFixture(taskId: string): {
	directory: string;
	hash: string;
} {
	const directory = mkdtempSync(join(tmpdir(), "docket-application-"));
	expect(
		Bun.spawnSync(["git", "init", "-q"], { cwd: directory }).exitCode,
	).toBe(0);
	Bun.spawnSync(["git", "config", "user.email", "app@example.test"], {
		cwd: directory,
	});
	Bun.spawnSync(["git", "config", "user.name", "Application"], {
		cwd: directory,
	});
	writeFileSync(join(directory, "implementation.txt"), "implemented\n");
	return { directory, hash: commitIn(directory, `implement ${taskId}`) };
}

function createUpdateArchive(): string {
	const directory = mkdtempSync(join(tmpdir(), "docket-update-archive-"));
	const source = join(directory, "docket-fixtures");
	mkdirSync(source);
	for (const file of [
		"task",
		"README.md",
		"RULES.md",
		"SETUP.md",
		"STRUCTURE.md",
		"flow.md",
	])
		copyFileSync(join(root, file), join(source, file));
	for (const directoryName of ["skills", "scripts", "fixtures"])
		cpSync(join(root, directoryName), join(source, directoryName), {
			recursive: true,
		});
	cpSync(
		join(root, "issues", "templates"),
		join(source, "issues", "templates"),
		{
			recursive: true,
		},
	);
	const archive = join(directory, "docket-fixtures.tar.gz");
	expect(
		Bun.spawnSync(["tar", "-czf", archive, "-C", directory, "docket-fixtures"])
			.exitCode,
	).toBe(0);
	return archive;
}

describe("legacy human CLI compatibility", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} prints help after an unknown human command`, () => {
			withFixture((fixture) => {
				const result = run(fixture, entrypoint, ["unknown-command"]);
				expect(result.exitCode).toBe(1);
				expect(result.stderr).toBe("Unknown command: unknown-command\n");
				expect(result.stdout).toBe(`${HELP}\n`);
			});
		});

		test(`${entrypoint} preserves legacy files for read-only commands`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				const assignmentsPath = join(fixture, "assignments.yaml");
				const originalIssue = readFileSync(issuePath, "utf-8");
				const originalAssignments = readFileSync(assignmentsPath, "utf-8");

				const list = run(fixture, entrypoint, ["list"]);
				expect(list.exitCode).toBe(0);
				expect(list.stdout).toContain("id");
				expect(list.stdout).toContain("legacy-task");
				expect(run(fixture, entrypoint, ["lint"]).exitCode).toBe(0);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);

				expect(readFileSync(issuePath, "utf-8")).toBe(originalIssue);
				expect(readFileSync(assignmentsPath, "utf-8")).toBe(
					originalAssignments,
				);
			});
		});

		test(`${entrypoint} supports ordinary human claim, release, and archive`, () => {
			withFixture((fixture) => {
				const claim = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--owner",
					"yago",
				]);
				expect(claim.exitCode).toBe(0);
				expect(claim.stdout).toContain("Claimed 'legacy-task' by 'yago'");

				const release = run(fixture, entrypoint, ["release", "legacy-task"]);
				expect(release.exitCode).toBe(0);
				expect(release.stdout).toContain("Released 'legacy-task'");
				const releasedIssue = readFileSync(
					join(fixture, "issues", "automation", "legacy-task.md"),
					"utf-8",
				);
				expect(releasedIssue).toContain("<!-- docket:task-log:start -->");
				expect(releasedIssue.match(/docket:event id=/g)).toHaveLength(2);

				const close = run(fixture, entrypoint, ["close", "legacy-assigned"]);
				expect(close.exitCode).toBe(0);
				expect(close.stdout).toContain(
					"Closed 'legacy-assigned' → issues/automation/done/",
				);
				expect(
					existsSync(
						join(fixture, "issues", "automation", "legacy-assigned.md"),
					),
				).toBe(false);
				const archive = join(
					fixture,
					"issues",
					"automation",
					"done",
					`${new Date().toISOString().slice(0, 10)}-legacy-assigned.md`,
				);
				expect(existsSync(archive)).toBe(true);
				expect(readFileSync(archive, "utf-8")).toContain(
					"<!-- docket:event id=close-",
				);
			});
		});
	}

	test("staging failure restores every touched legacy fixture file byte-for-byte", () => {
		withFixture((fixture) => {
			const paths = [
				join(fixture, "assignments.yaml"),
				join(fixture, "flow.md"),
				join(fixture, "issues", "automation", "legacy-task.md"),
			];
			const before = paths.map((path) => readFileSync(path, "utf-8"));
			writeFileSync(
				join(fixture, ".git", "index.lock"),
				"forced staging failure\n",
			);

			const result = run(fixture, "source", [
				"claim",
				"legacy-task",
				"--owner",
				"yago",
			]);
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain(
				"Task state was restored after git staging/commit failed.",
			);
			expect(paths.map((path) => readFileSync(path, "utf-8"))).toEqual(before);
		});
	});

	test("lint reports malformed Task Log markers", () => {
		withFixture((fixture) => {
			writeFileSync(
				join(fixture, "issues", "automation", "malformed-log.md"),
				`---
id: malformed-log
status: open
priority: P2
tags: [automation]
created_at: 2026-07-14
---

## Task Log

<!-- docket:task-log:start -->
`,
			);
			const result = run(fixture, "source", ["lint"]);
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain("Task Log must contain exactly one");
			expect(
				result.stderr.match(/Failed: \d+ error\(s\), \d+ warning\(s\)\./g),
			).toHaveLength(1);
		});
	});

	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} enforces configured agent completion gates and records explicit evidence`, () => {
			withFixture((fixture) => {
				const taskId = "guarded-task";
				const app = createApplicationFixture(taskId);
				try {
					writeFileSync(
						join(fixture, "docket.json"),
						JSON.stringify({
							version: 1,
							completion: {
								acceptanceCriteria: "agents",
								relatedCommits: "agents",
								cleanWorktree: "agents",
								requireActiveAssignment: "agents",
								allowOverride: true,
							},
						}),
					);
					writeFileSync(
						join(fixture, "issues", "automation", `${taskId}.md`),
						`---
id: ${taskId}
title: Guarded task
status: in-progress
priority: P2
owner: codex
owner_type: agent
agent_id: codex
tags: [automation]
created_at: 2026-07-14
closed_at: null
---

## Acceptance Criteria

- [ ] implementation is verified
`,
					);
					writeFileSync(
						join(fixture, "assignments.yaml"),
						`- task_id: ${taskId}
  status: active
  owner: codex
  owner_type: agent
  agent_id: codex
  worktree: ${app.directory}
  branch: main
  claimed_at: 2026-07-14T10:00:00.000Z
  lease_until: 2026-07-14T12:00:00.000Z
  released_at: null
`,
					);
					commitIn(fixture, "add guarded fixture");
					const blocked = run(fixture, entrypoint, ["close", taskId]);
					expect(blocked.exitCode).not.toBe(0);
					expect(blocked.stderr).toContain("Acceptance criterion is unchecked");
					expect(blocked.stderr).toContain("Related commits are required");

					const issue = join(fixture, "issues", "automation", `${taskId}.md`);
					writeFileSync(
						issue,
						readFileSync(issue, "utf-8").replace("- [ ]", "- [x]"),
					);
					commitIn(fixture, "check guarded criterion");
					const close = run(fixture, entrypoint, [
						"close",
						taskId,
						"--commit",
						app.hash,
					]);
					expect(close.exitCode).toBe(0);
					const archived = readFileSync(
						join(
							fixture,
							"issues",
							"automation",
							"done",
							`${new Date().toISOString().slice(0, 10)}-${taskId}.md`,
						),
						"utf-8",
					);
					expect(archived).toContain(app.hash);
				} finally {
					rmSync(app.directory, { recursive: true, force: true });
				}
			});
		});
	}

	test("configured override and wontfix require a reason and preserve it in history", () => {
		withFixture((fixture) => {
			writeFileSync(
				join(fixture, "docket.json"),
				JSON.stringify({
					version: 1,
					completion: {
						acceptanceCriteria: "all",
						relatedCommits: "all",
						cleanWorktree: "all",
						requireActiveAssignment: "all",
						allowOverride: true,
					},
				}),
			);
			const noReason = run(fixture, "source", [
				"close",
				"legacy-task",
				"--force",
			]);
			expect(noReason.exitCode).not.toBe(0);
			expect(noReason.stderr).toContain("requires --reason");
			const override = run(fixture, "source", [
				"close",
				"legacy-task",
				"--force",
				"--reason",
				"reviewed",
			]);
			expect(override.exitCode).toBe(0);
			const archive = readFileSync(
				join(
					fixture,
					"issues",
					"automation",
					"done",
					`${new Date().toISOString().slice(0, 10)}-legacy-task.md`,
				),
				"utf-8",
			);
			expect(archive).toContain("completion override: reviewed");
		});
	});
});

describe("deterministic next task selection", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} selects the same highest-priority oldest task regardless of issue creation order`, () => {
			withFixture((fixture) => {
				const issues = join(fixture, "issues");
				const task = (id: string, priority: string, createdAt: string) => `---
id: ${id}
title: ${id}
status: ready-for-agent
priority: ${priority}
owner: codex
owner_type: agent
agent_id: codex
tags: [automation, selected]
created_at: ${createdAt}
closed_at: null
---
`;
				mkdirSync(join(issues, "z-last"), { recursive: true });
				mkdirSync(join(issues, "a-first"), { recursive: true });
				writeFileSync(
					join(issues, "z-last", "later-p1.md"),
					task("later-p1", "P1", "2026-07-02"),
				);
				writeFileSync(
					join(issues, "a-first", "older-p1-b.md"),
					task("older-p1-b", "P1", "2026-07-01"),
				);
				writeFileSync(
					join(issues, "z-last", "older-p1-a.md"),
					task("older-p1-a", "P1", "2026-07-01"),
				);
				writeFileSync(
					join(issues, "a-first", "oldest-p2.md"),
					task("oldest-p2", "P2", "2020-01-01"),
				);

				const beforeIssue = readFileSync(
					join(issues, "z-last", "older-p1-a.md"),
					"utf-8",
				);
				const beforeAssignments = readFileSync(
					join(fixture, "assignments.yaml"),
					"utf-8",
				);
				const result = run(fixture, entrypoint, ["next", "--json"]);
				expect(result.exitCode).toBe(0);
				expect(jsonResult(result).data.task).toMatchObject({
					id: "older-p1-a",
					priority: "P1",
				});
				expect(
					readFileSync(join(issues, "z-last", "older-p1-a.md"), "utf-8"),
				).toBe(beforeIssue);
				expect(readFileSync(join(fixture, "assignments.yaml"), "utf-8")).toBe(
					beforeAssignments,
				);
			});
		});

		test(`${entrypoint} shares list filters and reports an empty selection successfully`, () => {
			withFixture((fixture) => {
				const filtered = run(fixture, entrypoint, [
					"next",
					"--status",
					"open",
					"--scope",
					"automation",
					"--owner",
					"human",
					"--tag",
					"automation",
					"--json",
				]);
				expect(filtered.exitCode).toBe(0);
				expect(jsonResult(filtered).data.task).toMatchObject({
					id: "legacy-task",
				});

				const empty = run(fixture, entrypoint, [
					"next",
					"--tag",
					"no-match",
					"--json",
				]);
				expect(empty.exitCode).toBe(0);
				expect(jsonResult(empty).data.task).toBeNull();

				const human = run(fixture, entrypoint, ["next", "--tag", "no-match"]);
				expect(human.exitCode).toBe(0);
				expect(human.stdout).toBe("No tasks available.\n");
			});
		});
	}
});

describe("atomic task take", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} takes a filtered task with an agent claim and returns null for an empty queue`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				writeFileSync(
					issuePath,
					readFileSync(issuePath, "utf-8").replace(
						"status: open",
						"status: ready-for-agent",
					),
				);

				const taken = run(fixture, entrypoint, [
					"take",
					"--agent",
					"worker-1",
					"--lease",
					"30",
					"--scope",
					"automation",
					"--owner",
					"human",
					"--tag",
					"automation",
					"--json",
				]);
				expect(taken.exitCode).toBe(0);
				expect(jsonResult(taken).data).toMatchObject({
					task: { id: "legacy-task", status: "in-progress" },
					assignment: {
						task_id: "legacy-task",
						owner: "worker-1",
						owner_type: "agent",
						agent_id: "worker-1",
					},
				});
				expect(
					(jsonResult(taken).data.assignment as Record<string, unknown>)
						.claim_id,
				).toEqual(expect.any(String));
				expect(existsSync(join(fixture, ".docket-take.lock"))).toBe(false);

				const empty = run(fixture, entrypoint, [
					"take",
					"--agent",
					"worker-2",
					"--lease",
					"30",
					"--tag",
					"no-match",
					"--json",
				]);
				expect(empty.exitCode).toBe(0);
				expect(jsonResult(empty).data.task).toBeNull();
				expect(existsSync(join(fixture, ".docket-take.lock"))).toBe(false);
			});
		});

		test(`${entrypoint} expires stale claims and claims the recovered task in one take transaction`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				writeFileSync(
					issuePath,
					readFileSync(issuePath, "utf-8")
						.replace("status: open", "status: in-progress")
						.replace("owner: human", "owner: abandoned-agent")
						.replace("owner_type: human", "owner_type: agent")
						.replace("agent_id: null", "agent_id: abandoned-agent"),
				);
				writeFileSync(
					join(fixture, "assignments.yaml"),
					`${LEGACY_ASSIGNMENTS}- task_id: legacy-task
  status: active
  owner: abandoned-agent
  owner_type: agent
  agent_id: abandoned-agent
  worktree: null
  branch: null
  claim_id: old-claim
  claimed_at: 2025-01-01T00:00:00.000Z
  lease_until: 2025-01-01T00:01:00.000Z
  released_at: null
`,
				);

				const taken = run(fixture, entrypoint, [
					"take",
					"--agent",
					"recovery-worker",
					"--lease",
					"30",
					"--json",
				]);
				expect(taken.exitCode).toBe(0);
				expect(jsonResult(taken).data.task).toMatchObject({
					id: "legacy-task",
					status: "in-progress",
					owner: "recovery-worker",
				});
				const assignments = readFileSync(
					join(fixture, "assignments.yaml"),
					"utf-8",
				);
				expect(assignments).toContain("claim_id: old-claim");
				expect(assignments).toContain("status: expired");
				expect(assignments).toContain("owner: recovery-worker");
				const issue = readFileSync(issuePath, "utf-8");
				expect(issue).toContain("abandoned-agent claim expired");
				expect(issue).toContain("recovery-worker claimed task");
				expect(
					Bun.spawnSync(["git", "log", "-1", "--format=%s"], {
						cwd: fixture,
					})
						.stdout.toString()
						.trim(),
				).toBe("take(legacy-task): recovery-worker");
			});
		});

		test(`${entrypoint} recovers only a stale abandoned lock and preserves actionable live-lock diagnostics`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				writeFileSync(
					issuePath,
					readFileSync(issuePath, "utf-8").replace(
						"status: open",
						"status: ready-for-agent",
					),
				);
				const lockPath = join(fixture, ".docket-take.lock");
				mkdirSync(lockPath);
				writeFileSync(
					join(lockPath, "owner.json"),
					`${JSON.stringify({
						pid: -1,
						agent: "abandoned-worker",
						created_at: "2025-01-01T00:00:00.000Z",
						token: "abandoned",
					})}\n`,
				);
				const recovered = run(fixture, entrypoint, [
					"take",
					"--agent",
					"recovery-worker",
					"--lease",
					"30",
					"--json",
				]);
				expect(recovered.exitCode).toBe(0);
				expect(jsonResult(recovered).warnings.join("\n")).toContain(
					"Recovered stale task acquisition lock",
				);
				expect(existsSync(lockPath)).toBe(false);

				mkdirSync(lockPath);
				writeFileSync(
					join(lockPath, "owner.json"),
					`${JSON.stringify({
						pid: process.pid,
						agent: "live-worker",
						created_at: new Date().toISOString(),
						token: "live",
					})}\n`,
				);
				const blocked = run(fixture, entrypoint, [
					"take",
					"--agent",
					"blocked-worker",
					"--lease",
					"30",
					"--json",
				]);
				expect(blocked.exitCode).toBe(3);
				expect(jsonResult(blocked).error).toMatchObject({
					code: "TAKE_LOCK_HELD",
					details: { owner: "live-worker", pid: process.pid },
				});
				expect(existsSync(lockPath)).toBe(true);
			});
		});

		test(`${entrypoint} rolls back every task file and cleans its lock after staging failure`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				writeFileSync(
					issuePath,
					readFileSync(issuePath, "utf-8").replace(
						"status: open",
						"status: ready-for-agent",
					),
				);
				const paths = [
					join(fixture, "assignments.yaml"),
					join(fixture, "flow.md"),
					issuePath,
				];
				const before = paths.map((path) => readFileSync(path, "utf-8"));
				writeFileSync(join(fixture, ".git", "index.lock"), "forced failure\n");

				const failed = run(fixture, entrypoint, [
					"take",
					"--agent",
					"rollback-worker",
					"--lease",
					"30",
				]);
				expect(failed.exitCode).not.toBe(0);
				expect(failed.stderr).toContain(
					"Task state was restored after git staging/commit failed.",
				);
				expect(paths.map((path) => readFileSync(path, "utf-8"))).toEqual(
					before,
				);
				expect(existsSync(join(fixture, ".docket-take.lock"))).toBe(false);
			});
		});

		test(`${entrypoint} prevents concurrent processes from receiving the same task`, async () => {
			const fixture = createLegacyFixture();
			try {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				writeFileSync(
					issuePath,
					readFileSync(issuePath, "utf-8").replace(
						"status: open",
						"status: ready-for-agent",
					),
				);
				const hook = join(fixture, ".git", "hooks", "pre-commit");
				writeFileSync(hook, "#!/bin/sh\nsleep 1\n");
				chmodSync(hook, 0o755);

				const first = runAsync(fixture, entrypoint, [
					"take",
					"--agent",
					"first-worker",
					"--lease",
					"30",
					"--json",
				]);
				await waitForPath(join(fixture, ".docket-take.lock"));
				const second = await runAsync(fixture, entrypoint, [
					"take",
					"--agent",
					"second-worker",
					"--lease",
					"30",
					"--json",
				]);
				const firstResult = await first;

				expect(firstResult.exitCode).toBe(0);
				expect(jsonResult(firstResult).data.task).toMatchObject({
					id: "legacy-task",
				});
				expect(second.exitCode).toBe(3);
				expect(jsonResult(second).error.code).toBe("TAKE_LOCK_HELD");
				expect(
					readFileSync(join(fixture, "assignments.yaml"), "utf-8").match(
						/- task_id: legacy-task/g,
					),
				).toHaveLength(1);
				expect(existsSync(join(fixture, ".docket-take.lock"))).toBe(false);
			} finally {
				rmSync(fixture, { recursive: true, force: true });
			}
		});
	}
});

describe("notes and lifecycle history", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} appends human and multiline agent notes`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"legacy-task.md",
				);
				const human = run(fixture, entrypoint, [
					"note",
					"legacy-task",
					"Remember the human context.",
				]);
				expect(human.exitCode).toBe(0);
				let issue = readFileSync(issuePath, "utf-8");
				expect(issue).toContain("This installation predates Task Log support.");
				expect(issue).toContain("— comment — human");
				expect(issue).toContain("Remember the human context.");

				const agent = run(
					fixture,
					entrypoint,
					[
						"note",
						"legacy-task",
						"--stdin",
						"--kind",
						"implementation-note",
						"--author",
						"codex",
						"--claim",
						"claim-123",
						"--run",
						"run-456",
						"--json",
					],
					"First line\n\nSecond line\n",
				);
				expect(agent.exitCode).toBe(0);
				expect(jsonResult(agent).data.note).toMatchObject({
					kind: "implementation-note",
					author: "codex",
					claim: "claim-123",
					run: "run-456",
					body: "First line\n\nSecond line",
				});
				issue = readFileSync(issuePath, "utf-8");
				expect(issue).toContain(
					"claim=claim-123 run=run-456 kind=implementation-note",
				);
				expect(issue).toContain("First line\n\nSecond line");
			});
		});

		test(`${entrypoint} stores custom kinds and reports missing JSON input`, () => {
			withFixture((fixture) => {
				expect(
					run(fixture, entrypoint, [
						"note",
						"legacy-task",
						"Custom taxonomy stays open.",
						"--kind",
						"field-report",
					]).exitCode,
				).toBe(0);
				expect(
					readFileSync(
						join(fixture, "issues", "automation", "legacy-task.md"),
						"utf-8",
					),
				).toContain("kind=field-report");

				const missingText = run(fixture, entrypoint, [
					"note",
					"legacy-task",
					"--author",
					"codex",
					"--json",
				]);
				expect(missingText.exitCode).toBe(2);
				expect(jsonResult(missingText).error.code).toBe("MISSING_INPUT");
				const missingAuthor = run(
					fixture,
					entrypoint,
					["note", "legacy-task", "--stdin", "--json"],
					"Needs an author",
				);
				expect(missingAuthor.exitCode).toBe(2);
				expect(jsonResult(missingAuthor).error.code).toBe("MISSING_INPUT");
			});
		});

		test(`${entrypoint} records create, triage, release, and expiry once`, () => {
			withFixture((fixture) => {
				expect(
					run(fixture, entrypoint, ["new", "automation", "Lifecycle task"])
						.exitCode,
				).toBe(0);
				expect(
					readFileSync(
						join(fixture, "issues", "automation", "lifecycle-task.md"),
						"utf-8",
					).match(/docket:event id=create-/g),
				).toHaveLength(1);

				expect(
					run(fixture, entrypoint, ["triage", "legacy-task", "ready-for-agent"])
						.exitCode,
				).toBe(0);
				expect(
					readFileSync(
						join(fixture, "issues", "automation", "legacy-task.md"),
						"utf-8",
					).match(/docket:event id=triage-/g),
				).toHaveLength(1);

				expect(
					run(fixture, entrypoint, ["release", "legacy-assigned"]).exitCode,
				).toBe(0);
				const assignedIssue = join(
					fixture,
					"issues",
					"automation",
					"legacy-assigned.md",
				);
				expect(
					readFileSync(assignedIssue, "utf-8").match(
						/docket:event id=release-/g,
					),
				).toHaveLength(1);

				const assignmentsPath = join(fixture, "assignments.yaml");
				writeFileSync(
					assignmentsPath,
					readFileSync(assignmentsPath, "utf-8")
						.replace("status: released", "status: active")
						.replace(
							"lease_until: null",
							"lease_until: 2020-01-01T00:00:00.000Z",
						),
				);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);
				expect(
					readFileSync(assignedIssue, "utf-8").match(
						/docket:event id=expiry-/g,
					),
				).toHaveLength(1);
			});
		});
	}

	test("appendNote treats a duplicate note id as a no-op", () => {
		const note = {
			id: "note-stable-id",
			timestamp: "2026-07-27T12:00:00.000Z",
			kind: "decision",
			author: "codex",
			body: "Keep the first note.",
		};
		const once = appendNote(LEGACY_TASK, note);
		expect(
			appendNote(once, { ...note, body: "Do not replace the first note." }),
		).toBe(once);
	});

	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} note rejects managed Task Log markers as invalid usage`, () => {
			withFixture((fixture) => {
				const result = run(fixture, entrypoint, [
					"note",
					"legacy-task",
					"<!-- docket:note id=injected -->",
					"--json",
				]);
				expect(result.exitCode).toBe(2);
				expect(jsonResult(result).error.code).toBe("INVALID_USAGE");
				expect(jsonResult(result).error.message).toBe(
					"Note text must not contain Docket Task Log markers",
				);
			});
		});
	}

	test("note staging failure restores the issue byte-for-byte", () => {
		withFixture((fixture) => {
			const issuePath = join(fixture, "issues", "automation", "legacy-task.md");
			const before = readFileSync(issuePath, "utf-8");
			writeFileSync(join(fixture, ".git", "index.lock"), "forced failure\n");
			expect(
				run(fixture, "source", ["note", "legacy-task", "Must roll back"])
					.exitCode,
			).not.toBe(0);
			expect(readFileSync(issuePath, "utf-8")).toBe(before);
		});
	});
});

describe("cross-task note scouting", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} scouts structured notes from active and archived tasks without rewriting them`, () => {
			withFixture((fixture) => {
				const archivedDir = join(fixture, "issues", "automation", "done");
				mkdirSync(archivedDir, { recursive: true });
				const archivedPath = join(archivedDir, "2025-01-04-archived-notes.md");
				writeFileSync(
					archivedPath,
					TASK_WITH_LOG.replace("id: task-with-log", "id: archived-notes")
						.replace(
							"title: Task with complete context",
							"title: Archived notes",
						)
						.replace("status: in-progress", "status: done")
						.replace("owner: codex", "owner: archivist")
						.replace("agent_id: codex", "agent_id: archivist")
						.replaceAll("— codex", "— archivist")
						.replace(
							"This identifier sorts before the previous note.",
							"This identifier sorts before the previous note.\n\n#### 2025-01-03 10:45 UTC — human context — archivist\n\nHuman context without structured metadata stays in the task.",
						),
				);
				const activePath = join(
					fixture,
					"issues",
					"automation",
					"task-with-log.md",
				);
				writeFileSync(activePath, TASK_WITH_LOG);
				const before = new Map(
					[activePath, archivedPath].map((path) => [
						path,
						readFileSync(path, "utf-8"),
					]),
				);

				const result = run(fixture, entrypoint, ["notes", "--json"]);
				expect(result.exitCode).toBe(0);
				const notes = jsonResult(result).data.notes as Record<
					string,
					unknown
				>[];
				expect(notes).toHaveLength(4);
				expect(notes.map((note) => note.note_id)).toEqual([
					"note-first",
					"note-second",
					"note-first",
					"note-second",
				]);
				expect(notes[0]).toMatchObject({
					task_id: "archived-notes",
					task_path: "issues/automation/done/2025-01-04-archived-notes.md",
					task_status: "done",
					task_scope: "automation",
					kind: "blocker",
					author: "archivist",
					timestamp: "2025-01-03T10:00:00.000Z",
					content: "This identifier sorts before the previous note.",
				});
				expect(
					notes.some((note) => String(note.content).includes("Human context")),
				).toBe(false);
				for (const [path, contents] of before)
					expect(readFileSync(path, "utf-8")).toBe(contents);

				const blockers = run(fixture, entrypoint, [
					"notes",
					"--kind",
					"blocker",
					"--status",
					"done",
					"--scope",
					"automation",
					"--author",
					"archivist",
					"--json",
				]);
				expect(blockers.exitCode).toBe(0);
				expect(jsonResult(blockers).data.notes).toEqual([
					expect.objectContaining({
						task_id: "archived-notes",
						note_id: "note-first",
					}),
				]);

				const empty = run(fixture, entrypoint, [
					"notes",
					"--kind",
					"rough-edge",
					"--json",
				]);
				expect(empty.exitCode).toBe(0);
				expect(jsonResult(empty).data.notes).toEqual([]);
				expect(
					run(fixture, entrypoint, ["show", "archived-notes"]).stdout,
				).toContain(
					"Human context without structured metadata stays in the task.",
				);
			});
		});
	}
});

describe("agent claim identity and renewal", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} issues claim IDs, renews from now, and keeps human commands compatible`, () => {
			withFixture((fixture) => {
				const claim = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"codex",
					"--lease",
					"1",
					"--json",
				]);
				expect(claim.exitCode).toBe(0);
				const claimId = (
					jsonResult(claim).data.assignment as Record<string, unknown>
				).claim_id;
				expect(claimId).toEqual(expect.any(String));

				const renewStartedAt = Date.now();
				const renewed = run(fixture, entrypoint, [
					"renew",
					"legacy-task",
					"--claim",
					String(claimId),
					"--lease",
					"60",
					"--json",
				]);
				expect(renewed.exitCode).toBe(0);
				const renewedAssignment = jsonResult(renewed).data.assignment as Record<
					string,
					unknown
				>;
				expect(
					Date.parse(String(renewedAssignment.lease_until)),
				).toBeGreaterThan(renewStartedAt + 59 * 60_000);

				// JSON is a serialization choice, not an ownership requirement.
				const unguardedRelease = run(fixture, entrypoint, [
					"release",
					"legacy-task",
					"--json",
				]);
				expect(unguardedRelease.exitCode).toBe(0);
			});
		});

		test(`${entrypoint} rejects stale claim IDs after expiry and replacement`, () => {
			withFixture((fixture) => {
				const first = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"codex-old",
					"--lease",
					"60",
					"--json",
				]);
				const oldClaim = String(
					(jsonResult(first).data.assignment as Record<string, unknown>)
						.claim_id,
				);
				const assignmentsPath = join(fixture, "assignments.yaml");
				writeFileSync(
					assignmentsPath,
					readFileSync(assignmentsPath, "utf-8").replace(
						new RegExp(
							`(claim_id: ${oldClaim}\\n  claimed_at: .*\\n  )lease_until: .*`,
						),
						"$1lease_until: 2020-01-01T00:00:00.000Z",
					),
				);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);
				expect(
					readFileSync(
						join(fixture, "issues", "automation", "legacy-task.md"),
						"utf-8",
					),
				).toContain("status: ready-for-agent");

				const replacement = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"codex-new",
					"--lease",
					"60",
					"--json",
				]);
				expect(replacement.exitCode).toBe(0);
				const replacementClaim = String(
					(jsonResult(replacement).data.assignment as Record<string, unknown>)
						.claim_id,
				);
				expect(replacementClaim).not.toBe(oldClaim);

				for (const args of [
					["renew", "legacy-task", "--claim", oldClaim, "--lease", "60"],
					["release", "legacy-task", "--claim", oldClaim],
					["close", "legacy-task", "--claim", oldClaim],
				]) {
					const result = run(fixture, entrypoint, args);
					expect(result.exitCode).toBe(1);
					expect(result.stderr).toContain("is not the active claim");
				}
				expect(readFileSync(assignmentsPath, "utf-8")).toContain(
					`claim_id: ${replacementClaim}`,
				);
				expect(existsSync(join(fixture, "issues", "automation", "done"))).toBe(
					false,
				);
			});
		});
	}
});

describe("participant roles and outcomes", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} keeps one primary while distinct participant slots coexist and finish independently`, () => {
			withFixture((fixture) => {
				selectAdversarialReviewFixture(fixture);
				expect(
					run(fixture, entrypoint, ["claim", "legacy-task", "--owner", "yago"])
						.exitCode,
				).toBe(0);

				const first = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-one",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-1",
					"--run",
					"cycle-a",
					"--lease",
					"60",
					"--json",
				]);
				expect(first.exitCode).toBe(0);
				const firstClaim = String(
					(jsonResult(first).data.assignment as Record<string, unknown>)
						.claim_id,
				);
				expect(
					jsonResult(first).data.assignment as Record<string, unknown>,
				).toMatchObject({
					assignment_type: "participant",
					role: "reviewer",
					slot: "reviewer-1",
					run_id: "cycle-a",
					claim_id: firstClaim,
				});

				const second = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-two",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-2",
					"--run",
					"cycle-a",
					"--lease",
					"60",
					"--json",
				]);
				expect(second.exitCode).toBe(0);
				const secondClaim = String(
					(jsonResult(second).data.assignment as Record<string, unknown>)
						.claim_id,
				);

				const duplicateSlot = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-three",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-1",
					"--lease",
					"60",
					"--json",
				]);
				expect(duplicateSlot.exitCode).toBe(1);
				expect(jsonResult(duplicateSlot).error.code).toBe(
					"TASK_ALREADY_CLAIMED",
				);

				const finished = run(fixture, entrypoint, [
					"finish",
					"legacy-task",
					"--claim",
					firstClaim,
					"--outcome",
					"approved",
					"--note",
					"Review is ready to merge.",
					"--json",
				]);
				expect(finished.exitCode).toBe(0);
				expect(
					jsonResult(finished).data.assignment as Record<string, unknown>,
				).toMatchObject({
					status: "completed",
					outcome: "approved",
					claim_id: firstClaim,
					completed_at: expect.any(String),
					note_id: expect.any(String),
				});

				const custom = run(fixture, entrypoint, [
					"finish",
					"legacy-task",
					"--claim",
					secondClaim,
					"--outcome",
					"needs-escalation",
					"--json",
				]);
				expect(custom.exitCode).toBe(0);
				const issue = readFileSync(
					join(fixture, "issues", "automation", "legacy-task.md"),
					"utf-8",
				);
				expect(issue).toContain("status: in-progress");
				expect(issue).toContain("Review is ready to merge.");
				expect(issue).toContain(`claim=${firstClaim} run=cycle-a kind=outcome`);
				expect(issue).toContain("outcome 'needs-escalation'");

				const shown = run(fixture, entrypoint, [
					"show",
					"legacy-task",
					"--json",
				]);
				expect(shown.exitCode).toBe(0);
				const shownData = jsonResult(shown).data;
				expect(shownData.primary_assignment).toMatchObject({ owner: "yago" });
				expect(shownData.active_participants).toEqual([]);
				expect(shownData.participant_claims).toMatchObject([
					{ claim_id: firstClaim, status: "completed", outcome: "approved" },
					{
						claim_id: secondClaim,
						status: "completed",
						outcome: "needs-escalation",
					},
				]);
			});
		});

		test(`${entrypoint} rejects a stale participant finish after expiry and replacement`, () => {
			withFixture((fixture) => {
				selectAdversarialReviewFixture(fixture);
				const old = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-old",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-1",
					"--run",
					"cycle-a",
					"--lease",
					"60",
					"--json",
				]);
				expect(old.exitCode).toBe(0);
				const oldClaim = String(
					(jsonResult(old).data.assignment as Record<string, unknown>).claim_id,
				);
				const assignmentsPath = join(fixture, "assignments.yaml");
				writeFileSync(
					assignmentsPath,
					readFileSync(assignmentsPath, "utf-8").replace(
						new RegExp(
							`(claim_id: ${oldClaim}\\n  claimed_at: .*\\n  )lease_until: .*`,
						),
						"$1lease_until: 2020-01-01T00:00:00.000Z",
					),
				);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);

				const replacement = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-new",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-1",
					"--run",
					"cycle-b",
					"--lease",
					"60",
					"--json",
				]);
				expect(replacement.exitCode).toBe(0);
				const replacementClaim = String(
					(jsonResult(replacement).data.assignment as Record<string, unknown>)
						.claim_id,
				);
				expect(replacementClaim).not.toBe(oldClaim);

				const staleFinish = run(fixture, entrypoint, [
					"finish",
					"legacy-task",
					"--claim",
					oldClaim,
					"--json",
				]);
				expect(staleFinish.exitCode).toBe(1);
				expect(jsonResult(staleFinish).error.code).toBe("CLAIM_MISMATCH");
			});
		});
	}

	test("finish rolls back its participant completion and optional Task Log note together", () => {
		withFixture((fixture) => {
			selectAdversarialReviewFixture(fixture);
			const participant = run(fixture, "source", [
				"claim",
				"legacy-task",
				"--agent",
				"reviewer",
				"--role",
				"reviewer",
				"--slot",
				"reviewer-1",
				"--run",
				"cycle-a",
				"--lease",
				"60",
				"--json",
			]);
			expect(participant.exitCode).toBe(0);
			const claimId = String(
				(jsonResult(participant).data.assignment as Record<string, unknown>)
					.claim_id,
			);
			const paths = [
				join(fixture, "assignments.yaml"),
				join(fixture, "flow.md"),
				join(fixture, "issues", "automation", "legacy-task.md"),
			];
			const before = paths.map((path) => readFileSync(path, "utf-8"));
			writeFileSync(join(fixture, ".git", "index.lock"), "forced failure\n");
			expect(
				run(fixture, "source", [
					"finish",
					"legacy-task",
					"--claim",
					claimId,
					"--note",
					"This must roll back.",
				]).exitCode,
			).not.toBe(0);
			expect(paths.map((path) => readFileSync(path, "utf-8"))).toEqual(before);
		});
	});
});

describe("crew fixtures and slot visibility", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} reports deterministic slots and enforces reviewer capacity`, () => {
			withFixture((fixture) => {
				selectAdversarialReviewFixture(fixture);
				const initial = run(fixture, entrypoint, [
					"slots",
					"legacy-task",
					"--json",
				]);
				expect(initial.exitCode).toBe(0);
				expect(jsonResult(initial).data).toMatchObject({
					fixture: "adversarial-review",
					slots: [
						{ slot: "implementer-1", state: "free" },
						{ slot: "reviewer-1", state: "free" },
						{ slot: "reviewer-2", state: "free" },
						{ slot: "fixer-1", state: "free" },
					],
				});

				const first = run(fixture, entrypoint, [
					"take",
					"--agent",
					"reviewer-one",
					"--lease",
					"60",
					"--status",
					"open",
					"--role",
					"reviewer",
					"--run",
					"cycle-a",
					"--json",
				]);
				expect(first.exitCode).toBe(0);
				const firstAssignment = jsonResult(first).data.assignment as Record<
					string,
					unknown
				>;
				expect(firstAssignment).toMatchObject({ slot: "reviewer-1" });

				const second = run(fixture, entrypoint, [
					"take",
					"--agent",
					"reviewer-two",
					"--lease",
					"60",
					"--role",
					"reviewer",
					"--run",
					"cycle-a",
					"--json",
				]);
				expect(second.exitCode).toBe(0);
				const secondAssignment = jsonResult(second).data.assignment as Record<
					string,
					unknown
				>;
				expect(secondAssignment).toMatchObject({ slot: "reviewer-2" });

				const third = run(fixture, entrypoint, [
					"claim",
					"legacy-task",
					"--agent",
					"reviewer-three",
					"--role",
					"reviewer",
					"--slot",
					"reviewer-3",
					"--lease",
					"60",
					"--json",
				]);
				expect(third.exitCode).toBe(1);
				expect(jsonResult(third).error.message).toContain(
					"reviewer-1, reviewer-2",
				);

				const firstClaim = String(firstAssignment.claim_id);
				expect(
					run(fixture, entrypoint, [
						"finish",
						"legacy-task",
						"--claim",
						firstClaim,
						"--json",
					]).exitCode,
				).toBe(0);
				const secondClaim = String(secondAssignment.claim_id);
				const assignmentsPath = join(fixture, "assignments.yaml");
				writeFileSync(
					assignmentsPath,
					readFileSync(assignmentsPath, "utf-8").replace(
						new RegExp(
							`(claim_id: ${secondClaim}\\n  claimed_at: .*\\n  )lease_until: .*`,
						),
						"$1lease_until: 2020-01-01T00:00:00.000Z",
					),
				);
				expect(run(fixture, entrypoint, ["doctor"]).exitCode).toBe(0);
				const settled = run(fixture, entrypoint, [
					"slots",
					"legacy-task",
					"--run",
					"cycle-a",
					"--json",
				]);
				expect(settled.exitCode).toBe(0);
				const settledSlots = jsonResult(settled).data.slots as Record<
					string,
					unknown
				>[];
				expect(
					settledSlots.filter((slot) => slot.role === "reviewer"),
				).toMatchObject([
					{ slot: "reviewer-1", state: "completed" },
					{ slot: "reviewer-2", state: "expired" },
				]);

				const legacy = createLegacyFixture();
				try {
					const implicit = run(legacy, entrypoint, [
						"slots",
						"legacy-task",
						"--json",
					]);
					expect(implicit.exitCode).toBe(0);
					expect(jsonResult(implicit).data).toMatchObject({
						fixture: null,
						slots: [{ slot: "primary-1", state: "free" }],
					});
				} finally {
					rmSync(legacy, { recursive: true, force: true });
				}
			});
		});
	}

	test("lint gives actionable fixture validation for malformed role names", () => {
		withFixture((fixture) => {
			selectAdversarialReviewFixture(fixture);
			writeFileSync(
				join(fixture, "fixtures", "adversarial-review.json"),
				JSON.stringify({
					id: "adversarial-review",
					roles: [{ role: "not a role", slots: 0, exclusive: true }],
				}),
			);
			const result = run(fixture, "source", ["lint"]);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("roles[0].role must use lowercase");
		});
	});

	test("setup installs bundled fixtures and updater preserves a user fixture", () => {
		const fixture = mkdtempSync(join(tmpdir(), "docket-installer-"));
		const archive = createUpdateArchive();
		try {
			expect(
				Bun.spawnSync(["git", "init", "-q"], { cwd: fixture }).exitCode,
			).toBe(0);
			Bun.spawnSync(["git", "config", "user.email", "installer@example.test"], {
				cwd: fixture,
			});
			Bun.spawnSync(["git", "config", "user.name", "Installer"], {
				cwd: fixture,
			});
			writeFileSync(join(fixture, "README.md"), "host repository\n");
			expect(
				Bun.spawnSync(["git", "add", "."], { cwd: fixture }).exitCode,
			).toBe(0);
			expect(
				Bun.spawnSync(["git", "commit", "-qm", "host"], { cwd: fixture })
					.exitCode,
			).toBe(0);
			const env = {
				...process.env,
				DOCKET_ARCHIVE_URL: `file://${archive}`,
			};
			const setup = Bun.spawnSync(
				["bash", join(root, "scripts", "setup.sh"), "--yes"],
				{ cwd: fixture, env },
			);
			expect(setup.exitCode, setup.stderr.toString()).toBe(0);
			const bundled = join(
				fixture,
				"tasks",
				"fixtures",
				"adversarial-review.json",
			);
			expect(existsSync(bundled)).toBe(true);
			writeFileSync(bundled, '{"id":"user-owned"}\n');
			const update = Bun.spawnSync(
				["bash", join(root, "scripts", "update.sh"), "--yes"],
				{ cwd: fixture, env },
			);
			expect(update.exitCode).toBe(0);
			expect(readFileSync(bundled, "utf-8")).toBe('{"id":"user-owned"}\n');
		} finally {
			rmSync(fixture, { recursive: true, force: true });
			rmSync(dirname(archive), { recursive: true, force: true });
		}
	});
});

describe("implementation commit capture", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} captures claim bases, detects ranges, and retains full hashes in JSON`, () => {
			withFixture((fixture) => {
				const taskId = "legacy-task";
				const app = createApplicationFixture(taskId);
				try {
					expect(
						run(fixture, entrypoint, [
							"claim",
							taskId,
							"--agent",
							"codex",
							"--lease",
							"120",
							"--worktree",
							app.directory,
						]).exitCode,
					).toBe(0);
					writeFileSync(
						join(app.directory, "implementation.txt"),
						"detected\n",
					);
					const implementation = commitIn(
						app.directory,
						`implement ${taskId} capture`,
					);
					writeFileSync(join(app.directory, "implementation.txt"), "state\n");
					const stateCommit = commitIn(
						app.directory,
						"claim(other-task): state",
					);
					const detect = run(fixture, entrypoint, [
						"commits",
						"detect",
						taskId,
						"--json",
					]);
					expect(detect.exitCode).toBe(0);
					expect(jsonResult(detect).data.commits).toEqual([
						{ hash: implementation, subject: `implement ${taskId} capture` },
					]);
					expect(jsonResult(detect).data.recorded).toEqual([
						{ hash: implementation, subject: `implement ${taskId} capture` },
					]);
					expect(jsonResult(detect).data.commits).not.toContainEqual({
						hash: stateCommit,
						subject: "claim(other-task): state",
					});

					const list = run(fixture, entrypoint, [
						"commits",
						"list",
						taskId,
						"--json",
					]);
					expect(jsonResult(list).data.commits).toEqual([
						{
							hash: implementation,
							subject: `implement ${taskId} capture`,
							display_hash: implementation.slice(0, 12),
						},
					]);
					const issue = readFileSync(
						join(fixture, "issues", "automation", `${taskId}.md`),
						"utf-8",
					);
					expect(issue).toContain(`\`${implementation.slice(0, 12)}\``);
					expect(issue).toContain(`docket:commit hash=${implementation}`);
					expect(
						run(fixture, entrypoint, ["commits", "add", taskId, implementation])
							.exitCode,
					).toBe(0);
					expect(
						readFileSync(
							join(fixture, "issues", "automation", `${taskId}.md`),
							"utf-8",
						).match(/docket:commit hash=/g),
					).toHaveLength(1);
				} finally {
					rmSync(app.directory, { recursive: true, force: true });
				}
			});
		});
	}

	test("detect warns instead of guessing after rewritten history", () => {
		withFixture((fixture) => {
			const taskId = "legacy-task";
			const app = createApplicationFixture(taskId);
			try {
				expect(
					run(fixture, "source", [
						"claim",
						taskId,
						"--agent",
						"codex",
						"--lease",
						"120",
						"--worktree",
						app.directory,
					]).exitCode,
				).toBe(0);
				const assignments = join(fixture, "assignments.yaml");
				writeFileSync(
					assignments,
					readFileSync(assignments, "utf-8").replace(
						/base_commit: .*/,
						"base_commit: 0000000000000000000000000000000000000000",
					),
				);
				const result = run(fixture, "source", [
					"commits",
					"detect",
					taskId,
					"--json",
				]);
				expect(result.exitCode).toBe(0);
				expect(jsonResult(result).warnings.join(" ")).toContain(
					"history may have been rewritten",
				);
			} finally {
				rmSync(app.directory, { recursive: true, force: true });
			}
		});
	});
});

describe("versioned JSON command protocol", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} emits success envelopes for every read-only command`, () => {
			withFixture((fixture) => {
				for (const [command, args] of [
					["lint", ["lint", "--json"]],
					["config", ["config", "--json"]],
					["doctor", ["doctor", "--json"]],
					["render", ["render", "--json"]],
					["list", ["list", "--status", "status-with-no-matches", "--json"]],
					["ingest", ["ingest", "--json"]],
				] as const) {
					const result = run(fixture, entrypoint, [...args]);
					expect(result.exitCode).toBe(0);
					const output = jsonResult(result);
					expect(output.protocol_version).toBe(1);
					expect(output.ok).toBe(true);
					expect(output.command).toBe(command);
					expect(output.warnings).toBeArray();
					if (command === "list") expect(output.data.issues).toEqual([]);
					if (command === "ingest") expect(output.data.issues).toEqual([]);
				}
			});
		});

		test(`${entrypoint} emits success envelopes for every mutating command`, () => {
			for (const [command, args, assertion] of [
				[
					"new",
					["new", "automation", "JSON created task", "--json"],
					(output: JsonResult) =>
						expect((output.data.task as Record<string, unknown>).id).toBe(
							"json-created-task",
						),
				],
				[
					"claim",
					["claim", "legacy-task", "--owner", "yago", "--json"],
					(output: JsonResult) =>
						expect(
							(output.data.assignment as Record<string, unknown>).owner,
						).toBe("yago"),
				],
				[
					"take",
					[
						"take",
						"--agent",
						"json-worker",
						"--lease",
						"30",
						"--status",
						"open",
						"--json",
					],
					(output: JsonResult) =>
						expect(
							(output.data.assignment as Record<string, unknown>).owner,
						).toBe("json-worker"),
				],
				[
					"triage",
					["triage", "legacy-task", "ready-for-agent", "--json"],
					(output: JsonResult) =>
						expect(output.data.status).toBe("ready-for-agent"),
				],
				[
					"note",
					["note", "legacy-task", "JSON note", "--author", "codex", "--json"],
					(output: JsonResult) =>
						expect((output.data.note as Record<string, unknown>).kind).toBe(
							"comment",
						),
				],
				[
					"release",
					["release", "legacy-assigned", "--json"],
					(output: JsonResult) =>
						expect(
							(output.data.assignment as Record<string, unknown>).status,
						).toBe("released"),
				],
				[
					"close",
					["close", "legacy-assigned", "--json"],
					(output: JsonResult) => expect(output.data.status).toBe("done"),
				],
			] as const) {
				withFixture((fixture) => {
					const result = run(fixture, entrypoint, [...args]);
					expect(result.exitCode).toBe(0);
					const output = jsonResult(result);
					expect(output.protocol_version).toBe(1);
					expect(output.ok).toBe(true);
					expect(output.command).toBe(command);
					assertion(output);
				});
			}
		});

		test(`${entrypoint} maps usage, domain, and operational JSON failures`, () => {
			withFixture((fixture) => {
				const unknown = run(fixture, entrypoint, ["unknown-command", "--json"]);
				expect(unknown.exitCode).toBe(2);
				expect(jsonResult(unknown).error.code).toBe("INVALID_USAGE");
				expect(unknown.stdout).not.toContain("Commands:");

				const usage = run(fixture, entrypoint, ["claim", "--json"]);
				expect(usage.exitCode).toBe(2);
				expect(jsonResult(usage).error.code).toBe("INVALID_USAGE");

				const takeUsage = run(fixture, entrypoint, ["take", "--json"]);
				expect(takeUsage.exitCode).toBe(2);
				expect(jsonResult(takeUsage).error.code).toBe("INVALID_USAGE");

				const domain = run(fixture, entrypoint, [
					"claim",
					"legacy-assigned",
					"--json",
				]);
				expect(domain.exitCode).toBe(1);
				expect(jsonResult(domain).error.code).toBe("TASK_ALREADY_CLAIMED");

				rmSync(join(fixture, "flow.md"));
				const operational = run(fixture, entrypoint, ["render", "--json"]);
				expect(operational.exitCode).toBe(3);
				expect(jsonResult(operational).error.code).toBe("OPERATIONAL_ERROR");
			});
		});

		test(`${entrypoint} classifies nested config validation as domain failure`, () => {
			withFixture((fixture) => {
				writeFileSync(
					join(fixture, "docket.json"),
					JSON.stringify({
						version: 1,
						completion: { allowOverride: "yes" },
					}),
				);
				const result = run(fixture, entrypoint, ["config", "--json"]);
				expect(result.exitCode).toBe(1);
				expect(jsonResult(result).error.code).toBe("CONFIG_INVALID");
			});
		});

		test(`${entrypoint} classifies backend failures as operational`, () => {
			withFixture((fixture) => {
				const missingKey = run(fixture, entrypoint, [
					"ingest",
					"--backend",
					"api",
					"--json",
				]);
				expect(missingKey.exitCode).toBe(3);
				expect(jsonResult(missingKey).error.code).toBe("BACKEND_UNAVAILABLE");

				writeFileSync(
					join(fixture, "flow.md"),
					FLOW.replace("## Issue Scratchpad", "## Issue Scratchpad\n\n- task"),
				);
				const fakeBackend = join(fixture, "codex");
				writeFileSync(fakeBackend, "#!/bin/sh\nprintf 'not json\\n'\n", {
					mode: 0o755,
				});
				const invalidResponse = Bun.spawnSync(
					[
						"bun",
						entrypoint === "source" ? "src/cli.ts" : "task",
						"ingest",
						"--backend",
						"codex",
						"--json",
					],
					{
						cwd: fixture,
						env: {
							...process.env,
							PATH: `${fixture}:${process.env.PATH}`,
						},
					},
				);
				expect(invalidResponse.exitCode).toBe(3);
				expect(
					jsonResult({
						exitCode: invalidResponse.exitCode,
						stdout: invalidResponse.stdout.toString(),
						stderr: invalidResponse.stderr.toString(),
					}).error.code,
				).toBe("INVALID_BACKEND_RESPONSE");
			});
		});
	}

	test("JSON doctor warnings stay structured and stdout remains parseable", () => {
		withFixture((fixture) => {
			writeFileSync(
				join(fixture, "flow.md"),
				FLOW.replace(
					"### Active",
					"### Active\n\n- [-] Ghost task (id:ghost-task)",
				),
			);
			const result = run(fixture, "source", ["doctor", "--json"]);
			expect(result.exitCode).toBe(0);
			const output = jsonResult(result);
			expect(
				output.warnings.some((warning: string) => warning.includes("WARN:")),
			).toBe(true);
		});
	});

	test("JSON ingest returns missing input instead of prompting", () => {
		withFixture((fixture) => {
			writeFileSync(
				join(fixture, "flow.md"),
				FLOW.replace("## Issue Scratchpad", "## Issue Scratchpad\n\n- unclear"),
			);
			const fakeBackend = join(fixture, "codex");
			writeFileSync(
				fakeBackend,
				'#!/bin/sh\nprintf \'%s\\n\' \'{"type":"ambiguous","clarification":"Which scope?"}\'\n',
				{ mode: 0o755 },
			);
			const result = Bun.spawnSync(
				["bun", "src/cli.ts", "ingest", "--backend", "codex", "--json"],
				{
					cwd: fixture,
					env: {
						...process.env,
						PATH: `${fixture}:${process.env.PATH}`,
					},
				},
			);
			expect(result.exitCode).toBe(2);
			const output = jsonResult({
				exitCode: result.exitCode,
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
			});
			expect(output.error.code).toBe("MISSING_INPUT");
		});
	});

	test("JSON ingest reports issues committed before a later ambiguous bullet", () => {
		withFixture((fixture) => {
			writeFileSync(
				join(fixture, "flow.md"),
				FLOW.replace(
					"## Issue Scratchpad",
					"## Issue Scratchpad\n\n- create first issue\n- unclear second issue",
				),
			);
			const fakeBackend = join(fixture, "codex");
			writeFileSync(
				fakeBackend,
				`#!/bin/sh
count_file="$PWD/.backend-count"
count=0
if [ -f "$count_file" ]; then count=$(cat "$count_file"); fi
count=$((count + 1))
printf '%s' "$count" > "$count_file"
if [ "$count" -eq 1 ]; then
	printf '%s\\n' '{"type":"issue","scope":"automation","slug":"first-created","title":"First created","markdown":"---\\nid: first-created\\ntitle: First created\\nstatus: needs-triage\\npriority: P2\\nowner: human\\ntags: [automation]\\ncreated_at: 2026-07-27\\n---\\n"}'
else
	printf '%s\\n' '{"type":"ambiguous","clarification":"Which scope?"}'
fi
`,
				{ mode: 0o755 },
			);
			const result = Bun.spawnSync(
				["bun", "src/cli.ts", "ingest", "--backend", "codex", "--json"],
				{
					cwd: fixture,
					env: {
						...process.env,
						PATH: `${fixture}:${process.env.PATH}`,
					},
				},
			);
			expect(result.exitCode).toBe(2);
			const output = jsonResult({
				exitCode: result.exitCode,
				stdout: result.stdout.toString(),
				stderr: result.stderr.toString(),
			});
			expect(output.error.code).toBe("MISSING_INPUT");
			expect(output.error.details?.uncommitted_issue_ids).toEqual([
				"first-created",
			]);
			expect(
				existsSync(join(fixture, "issues", "automation", "first-created.md")),
			).toBe(true);
		});
	});
});

describe("show complete task context", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
		test(`${entrypoint} shows active task context in human and JSON formats without mutation`, () => {
			withFixture((fixture) => {
				const issuePath = join(
					fixture,
					"issues",
					"automation",
					"task-with-log.md",
				);
				const assignmentsPath = join(fixture, "assignments.yaml");
				const flowPath = join(fixture, "flow.md");
				writeFileSync(issuePath, TASK_WITH_LOG);
				writeFileSync(assignmentsPath, TASK_WITH_LOG_ASSIGNMENTS);
				const before = [issuePath, assignmentsPath, flowPath].map((path) =>
					readFileSync(path, "utf-8"),
				);

				const human = run(fixture, entrypoint, ["show", "task-with-log"]);
				expect(human.exitCode).toBe(0);
				expect(human.stdout).toContain(
					"Task with complete context (task-with-log)",
				);
				expect(human.stdout).toContain(
					"Active assignment: codex (agent), claimed 2025-01-03T09:00:00.000Z",
				);
				expect(human.stdout).toContain("Assignment history: 2 record(s)");
				expect(human.stdout).toContain("Keep this authored body exactly.");
				expect(human.stdout).toContain("bbb222 Second commit in file");
				expect(human.stdout).toContain(
					"- 2025-01-03T11:00:00.000Z — second event",
				);

				const json = run(fixture, entrypoint, [
					"show",
					"task-with-log",
					"--json",
				]);
				expect(json.exitCode).toBe(0);
				const output = jsonResult(json);
				expect(output.command).toBe("show");
				expect(Object.keys(output.data)).toEqual([
					"frontmatter",
					"body",
					"task_log",
					"task_log_markdown",
					"task_log_errors",
					"path",
					"scope",
					"primary_assignment",
					"has_active_assignment",
					"participant_claims",
					"active_participants",
					"assignment_history",
				]);
				expect(output.data.body).toBe(
					"\n## Context\n\nKeep this authored body exactly.",
				);
				expect(output.data.task_log_markdown).toContain(
					"Keep the parser output in file order.",
				);
				expect(output.data.path).toBe("issues/automation/task-with-log.md");
				expect(output.data.scope).toBe("automation");
				expect(output.data.has_active_assignment).toBe(true);
				expect(output.data.task_log_errors).toEqual([]);
				const taskLog = output.data.task_log as {
					commits: { hash: string }[];
					notes: { id: string }[];
					history: { id: string; text: string }[];
				};
				expect(taskLog.commits.map(({ hash }) => hash)).toEqual([
					"bbb222",
					"aaa111",
				]);
				expect(taskLog.notes.map(({ id }) => id)).toEqual([
					"note-second",
					"note-first",
				]);
				expect(taskLog.history.map(({ id }) => id)).toEqual([
					"event-second",
					"event-first",
				]);
				expect(
					(output.data.assignment_history as { owner: string }[]).map(
						({ owner }) => owner,
					),
				).toEqual(["first-owner", "codex"]);
				expect(
					(output.data.primary_assignment as { owner: string }).owner,
				).toBe("codex");

				expect(
					[issuePath, assignmentsPath, flowPath].map((path) =>
						readFileSync(path, "utf-8"),
					),
				).toEqual(before);
			});
		});

		test(`${entrypoint} finds archived tasks and distinguishes inactive assignment history`, () => {
			withFixture((fixture) => {
				const archiveDir = join(fixture, "issues", "automation", "done");
				mkdirSync(archiveDir, { recursive: true });
				writeFileSync(
					join(archiveDir, "2025-01-04-archived-context.md"),
					LEGACY_TASK.replace("legacy-task", "archived-context")
						.replace("Legacy task", "Archived context")
						.replace("status: open", "status: done")
						.replace("closed_at: null", "closed_at: 2025-01-04"),
				);
				writeFileSync(
					join(fixture, "assignments.yaml"),
					TASK_WITH_LOG_ASSIGNMENTS.replaceAll(
						"task-with-log",
						"archived-context",
					)
						.replace("status: active", "status: expired")
						.replace(
							"released_at: null",
							"released_at: 2025-01-04T00:00:00.000Z",
						),
				);

				const result = run(fixture, entrypoint, [
					"show",
					"archived-context",
					"--json",
				]);
				expect(result.exitCode).toBe(0);
				const output = jsonResult(result);
				expect(output.data.path).toBe(
					"issues/automation/done/2025-01-04-archived-context.md",
				);
				expect(output.data.primary_assignment).toBeNull();
				expect(output.data.has_active_assignment).toBe(false);
				expect(output.data.assignment_history).toBeArrayOfSize(2);
			});
		});

		test(`${entrypoint} returns stable structured errors for missing and ambiguous task ids`, () => {
			withFixture((fixture) => {
				const missing = run(fixture, entrypoint, [
					"show",
					"does-not-exist",
					"--json",
				]);
				expect(missing.exitCode).toBe(1);
				const missingOutput = jsonResult(missing);
				expect(missingOutput.error.code).toBe("TASK_NOT_FOUND");
				expect(missingOutput.error.details).toEqual({
					task_id: "does-not-exist",
				});

				const doneDir = join(fixture, "issues", "automation", "done");
				mkdirSync(doneDir, { recursive: true });
				writeFileSync(join(doneDir, "2025-01-04-legacy-task.md"), LEGACY_TASK);
				const ambiguous = run(fixture, entrypoint, [
					"show",
					"legacy-task",
					"--json",
				]);
				expect(ambiguous.exitCode).toBe(1);
				const ambiguousOutput = jsonResult(ambiguous);
				expect(ambiguousOutput.error.code).toBe("AMBIGUOUS_TASK_ID");
				expect(ambiguousOutput.error.details).toEqual({
					task_id: "legacy-task",
					paths: [
						"issues/automation/done/2025-01-04-legacy-task.md",
						"issues/automation/legacy-task.md",
					],
				});
			});
		});
	}
});
