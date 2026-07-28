import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	InstallerError,
	parseSetupArgs,
	parseUpdateArgs,
} from "../scripts/installer";

test("setup argument precedence is flags, environment, config, defaults", () => {
	const directory = mkdtempSync(join(tmpdir(), "docket-installer-config-"));
	const config = join(directory, "docket.json");
	try {
		writeFileSync(
			config,
			JSON.stringify({
				version: 1,
				installation: {
					directory: "configured-directory",
					branch: "configured-branch",
				},
			}),
		);
		expect(parseSetupArgs(["--config", config], {})).toMatchObject({
			directory: "configured-directory",
			branch: "configured-branch",
		});
		expect(
			parseSetupArgs(["--config", config], {
				DOCKET_DIR: "environment-directory",
			}),
		).toMatchObject({
			directory: "environment-directory",
			branch: "configured-branch",
		});
		expect(
			parseSetupArgs(["--config", config, "--branch", "flag-branch"], {
				DOCKET_BRANCH: "environment-branch",
			}),
		).toMatchObject({
			directory: "configured-directory",
			branch: "flag-branch",
		});
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("installer parsers reject unknown and incomplete arguments", () => {
	expect(() => parseSetupArgs(["--branch"], {})).toThrow(
		"--branch requires a value",
	);
	expect(() => parseUpdateArgs(["--regular-branch"])).toThrow(
		"Unknown argument: --regular-branch",
	);
	try {
		parseSetupArgs(["--unknown"], {});
		throw new Error("expected parsing to fail");
	} catch (error) {
		expect(error).toBeInstanceOf(InstallerError);
		expect((error as InstallerError).exitCode).toBe(2);
	}
});
