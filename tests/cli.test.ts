import { describe, expect, test } from "bun:test";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

function run(command: string[]): { exitCode: number; stdout: string } {
	const result = Bun.spawnSync(command, { cwd: root });
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
	};
}

describe("CLI entrypoints", () => {
	test("source and bundled entrypoints expose the same help", () => {
		const source = run(["bun", "src/cli.ts", "help"]);
		const bundled = run(["./task", "help"]);

		expect(source.exitCode).toBe(0);
		expect(bundled.exitCode).toBe(0);
		expect(bundled.stdout).toBe(source.stdout);
	});

	test("bundled entrypoint emits machine-readable issue lists", () => {
		const result = run([
			"./task",
			"list",
			"--scope",
			"scope-that-does-not-exist",
			"--json",
		]);

		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual([]);
	});

	test("bundled lint and doctor inspect issue filenames", () => {
		const fixture = mkdtempSync(join(tmpdir(), "docket-health-"));
		try {
			mkdirSync(join(fixture, "issues", "automation"), { recursive: true });
			copyFileSync(join(root, "task"), join(fixture, "task"));
			writeFileSync(
				join(fixture, "flow.md"),
				`# Flow

## Today

### Planned

### Active

### Completed

### Deferred

## Agent Queue

## Issue Scratchpad

## Meeting Notes

## Notes
`,
			);
			writeFileSync(
				join(fixture, "issues", "automation", "health-check.md"),
				`---
id: health-check
title: Health check
status: needs-triage
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2026-07-14
closed_at: null
---

## Context
`,
			);

			const lint = Bun.spawnSync(["bun", "task", "lint"], { cwd: fixture });
			const doctor = Bun.spawnSync(["bun", "task", "doctor"], {
				cwd: fixture,
			});

			expect(lint.exitCode).toBe(0);
			expect(doctor.exitCode).toBe(0);
		} finally {
			rmSync(fixture, { recursive: true, force: true });
		}
	});

	test("bundled entrypoint creates an issue from a template", () => {
		const fixture = mkdtempSync(join(tmpdir(), "docket-new-"));
		try {
			mkdirSync(join(fixture, "issues", "templates"), { recursive: true });
			copyFileSync(join(root, "task"), join(fixture, "task"));
			copyFileSync(
				join(root, "issues", "templates", "issue.md"),
				join(fixture, "issues", "templates", "issue.md"),
			);

			const result = Bun.spawnSync(
				["bun", "task", "new", "automation", "Bootstrap agent tasks"],
				{ cwd: fixture },
			);

			expect(result.exitCode).toBe(0);
			expect(
				existsSync(
					join(fixture, "issues", "automation", "bootstrap-agent-tasks.md"),
				),
			).toBe(true);
		} finally {
			rmSync(fixture, { recursive: true, force: true });
		}
	});
});
