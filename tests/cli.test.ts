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
import { HELP } from "../src/cli";

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
	mkdirSync(join(fixture, "issues", "templates"), { recursive: true });
	mkdirSync(join(fixture, "src"), { recursive: true });
	for (const file of [
		"cli.ts",
		"commands.ts",
		"config.ts",
		"frontmatter.ts",
		"protocol.ts",
		"repository.ts",
		"runtime.ts",
		"task-log.ts",
		"types.ts",
	]) {
		copyFileSync(join(root, "src", file), join(fixture, "src", file));
	}
	copyFileSync(join(root, "task"), join(fixture, "task"));
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
					"triage",
					["triage", "legacy-task", "ready-for-agent", "--json"],
					(output: JsonResult) =>
						expect(output.data.status).toBe("ready-for-agent"),
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
