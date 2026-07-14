import { describe, expect, test } from "bun:test";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function run(
	fixture: string,
	entrypoint: "source" | "bundled",
	args: string[],
): { exitCode: number; stdout: string; stderr: string } {
	const command =
		entrypoint === "source"
			? ["bun", "src/cli.ts", ...args]
			: ["bun", "task", ...args];
	const result = Bun.spawnSync(command, { cwd: fixture });
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

function createLegacyFixture(): string {
	const fixture = mkdtempSync(join(tmpdir(), "docket-legacy-"));
	mkdirSync(join(fixture, "issues", "automation"), { recursive: true });
	mkdirSync(join(fixture, "src"), { recursive: true });
	for (const file of [
		"cli.ts",
		"commands.ts",
		"config.ts",
		"frontmatter.ts",
		"repository.ts",
		"runtime.ts",
		"task-log.ts",
		"types.ts",
	]) {
		copyFileSync(join(root, "src", file), join(fixture, "src", file));
	}
	copyFileSync(join(root, "task"), join(fixture, "task"));
	writeFileSync(join(fixture, "flow.md"), FLOW);
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

function withFixture(assertion: (fixture: string) => void): void {
	const fixture = createLegacyFixture();
	try {
		assertion(fixture);
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
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

describe("legacy human CLI compatibility", () => {
	for (const entrypoint of ["source", "bundled"] as const) {
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
