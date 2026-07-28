import { expect, test } from "bun:test";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

const flow = `# Flow

## Today

### Planned

### Active

### Completed

### Deferred

## Agent Queue

## Issue Scratchpad
`;

const issue = (id: string) => `---
id: ${id}
title: ${id}
status: ready-for-agent
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
fixture: adversarial-review
created_at: 2026-07-28
closed_at: null
---

## Acceptance Criteria

- [ ] Fake-process loop
`;

function command(directory: string, args: string[]) {
	const result = Bun.spawnSync(["bun", "task", ...args], { cwd: directory });
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

function json(result: ReturnType<typeof command>) {
	expect(result.exitCode).toBe(0);
	return JSON.parse(result.stdout) as {
		data: { task: { id: string } | null; assignment?: { claim_id: string } };
	};
}

function fixture() {
	const directory = mkdtempSync(join(tmpdir(), "docket-reference-loops-"));
	mkdirSync(join(directory, "issues", "automation"), { recursive: true });
	mkdirSync(join(directory, "src"), { recursive: true });
	mkdirSync(join(directory, "fixtures"), { recursive: true });
	for (const file of [
		"cli.ts",
		"commands.ts",
		"config.ts",
		"fixtures.ts",
		"frontmatter.ts",
		"protocol.ts",
		"repository.ts",
		"runtime.ts",
		"task-log.ts",
		"types.ts",
	])
		copyFileSync(join(root, "src", file), join(directory, "src", file));
	copyFileSync(join(root, "task"), join(directory, "task"));
	copyFileSync(
		join(root, "fixtures", "adversarial-review.json"),
		join(directory, "fixtures", "adversarial-review.json"),
	);
	writeFileSync(join(directory, "flow.md"), flow);
	writeFileSync(join(directory, "assignments.yaml"), "");
	writeFileSync(
		join(directory, "issues", "automation", "loop-one.md"),
		issue("loop-one"),
	);
	writeFileSync(
		join(directory, "issues", "automation", "loop-two.md"),
		issue("loop-two"),
	);
	writeFileSync(
		join(directory, "fake-agent.ts"),
		`
		const [role, agent, run, outcome, mode, status] = process.argv.slice(2);
const take = Bun.spawnSync(["bun", "task", "take", "--agent", agent, "--lease", "60", "--role", role, "--run", run, "--status", status || "ready-for-agent", "--json"]);
if (take.exitCode !== 0) process.exit(take.exitCode);
const payload = JSON.parse(take.stdout.toString());
if (payload.data.task === null) process.exit(0);
if (mode === "acquire") {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
const finish = Bun.spawnSync(["bun", "task", "finish", payload.data.task.id, "--claim", payload.data.assignment.claim_id, "--outcome", outcome, "--note", "fake worker " + agent, "--json"]);
process.exit(finish.exitCode);
`,
	);
	for (const args of [
		["git", "init", "-q"],
		["git", "config", "user.email", "fake@example.test"],
		["git", "config", "user.name", "Fake workers"],
		["git", "add", "."],
		["git", "commit", "-qm", "fixture"],
	])
		expect(Bun.spawnSync(args, { cwd: directory }).exitCode).toBe(0);
	return directory;
}

test("reference loops use only fake local worker processes and cover recovery", async () => {
	const directory = fixture();
	try {
		const run = (
			role: string,
			agent: string,
			cycle: string,
			outcome: string,
			mode?: string,
			status?: string,
		) =>
			Bun.spawn(
				[
					"bun",
					"fake-agent.ts",
					role,
					agent,
					cycle,
					outcome,
					mode ?? "",
					status ?? "",
				],
				{
					// The fake process has no model or network dependency.
					cwd: directory,
					stdout: "pipe",
					stderr: "pipe",
				},
			);

		expect(
			await run("implementer", "fake-implementer", "cycle-1", "completed")
				.exited,
		).toBe(0);
		// Two fake workers acquire the distinct reviewer slots before the external
		// harness records their independent outcomes.
		const acquiredReviewers = [] as {
			data: { task: { id: string }; assignment: { claim_id: string } };
		}[];
		for (const agent of ["fake-reviewer-a", "fake-reviewer-b"]) {
			const worker = run(
				"reviewer",
				agent,
				"cycle-1",
				"approved",
				"acquire",
				"open",
			);
			expect(await worker.exited).toBe(0);
			acquiredReviewers.push(
				JSON.parse(await new Response(worker.stdout).text()) as {
					data: { task: { id: string }; assignment: { claim_id: string } };
				},
			);
		}
		for (const acquired of acquiredReviewers) {
			expect(acquired.data.task.id).toBe("loop-one");
			expect(
				command(directory, [
					"finish",
					acquired.data.task.id,
					"--claim",
					acquired.data.assignment.claim_id,
					"--outcome",
					"approved",
					"--json",
				]).exitCode,
			).toBe(0);
		}
		expect(
			await run(
				"fixer",
				"fake-fixer",
				"cycle-1",
				"completed",
				undefined,
				"open",
			).exited,
		).toBe(0);

		expect(
			command(directory, ["slots", "loop-one", "--run", "cycle-1", "--json"])
				.exitCode,
		).toBe(0);
		expect(
			readFileSync(
				join(directory, "issues", "automation", "loop-one.md"),
				"utf-8",
			),
		).toContain("fake worker fake-fixer");

		const stale = json(
			command(directory, [
				"take",
				"--agent",
				"fake-stale",
				"--lease",
				"60",
				"--role",
				"reviewer",
				"--run",
				"recovery",
				"--json",
			]),
		);
		const staleClaim = stale.data.assignment?.claim_id;
		expect(stale.data.task?.id).toBe("loop-two");
		expect(staleClaim).toEqual(expect.any(String));
		const assignments = join(directory, "assignments.yaml");
		writeFileSync(
			assignments,
			readFileSync(assignments, "utf-8").replace(
				new RegExp(
					`(claim_id: ${staleClaim}\\n  claimed_at: .*\\n  )lease_until: .*`,
				),
				"$1lease_until: 2020-01-01T00:00:00.000Z",
			),
		);
		expect(command(directory, ["doctor", "--json"]).exitCode).toBe(0);
		const rejected = command(directory, [
			"finish",
			"loop-two",
			"--claim",
			String(staleClaim),
			"--json",
		]);
		expect(rejected.exitCode).toBe(1);
		expect(JSON.parse(rejected.stdout).error.code).toBe("CLAIM_MISMATCH");
		expect(
			await run("reviewer", "fake-recovery", "recovery", "completed").exited,
		).toBe(0);

		const empty = json(
			command(directory, [
				"take",
				"--agent",
				"fake-empty",
				"--lease",
				"60",
				"--tag",
				"no-such-tag",
				"--json",
			]),
		);
		expect(empty.data.task).toBeNull();
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
