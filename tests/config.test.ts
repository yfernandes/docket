import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, effectiveConfig, readFileConfig } from "../src/config";

describe("docket configuration", () => {
	test("validates versions and policies without runtime dependencies", () => {
		const directory = mkdtempSync(join(tmpdir(), "docket-config-"));
		try {
			const path = join(directory, "docket.json");
			writeFileSync(path, JSON.stringify({ version: 2 }));
			expect(() => readFileConfig(path)).toThrow("version must be 1");
			writeFileSync(
				path,
				JSON.stringify({
					version: 1,
					completion: { relatedCommits: "sometimes" },
				}),
			);
			expect(() => readFileConfig(path)).toThrow("off, agents, all");
			writeFileSync(
				path,
				JSON.stringify({
					version: 1,
					completion: { allowSelfHostedCommitEvidence: "yes" },
				}),
			);
			expect(() => readFileConfig(path)).toThrow(
				"allowSelfHostedCommitEvidence must be a boolean",
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	test("uses CLI overrides before environment, file, and defaults", () => {
		const oldDir = process.env.DOCKET_DIR;
		const oldBranch = process.env.DOCKET_BRANCH;
		try {
			process.env.DOCKET_DIR = "environment-dir";
			process.env.DOCKET_BRANCH = "environment-branch";
			const config = effectiveConfig({
				directory: "cli-dir",
				branch: "cli-branch",
			});
			expect(config.installation).toEqual({
				directory: "cli-dir",
				branch: "cli-branch",
			});
		} finally {
			if (oldDir === undefined) delete process.env.DOCKET_DIR;
			else process.env.DOCKET_DIR = oldDir;
			if (oldBranch === undefined) delete process.env.DOCKET_BRANCH;
			else process.env.DOCKET_BRANCH = oldBranch;
		}
	});

	test("defaults self-hosted commit evidence to disabled", () => {
		expect(DEFAULT_CONFIG.completion.allowSelfHostedCommitEvidence).toBe(false);
	});
});
