import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigValidationError } from "./protocol";
import { ROOT } from "./runtime";

export type CompletionPolicy = "off" | "agents" | "all";

export interface DocketConfig {
	version: 1;
	installation: { directory: string; branch: string };
	completion: {
		acceptanceCriteria: CompletionPolicy;
		relatedCommits: CompletionPolicy;
		cleanWorktree: CompletionPolicy;
		requireActiveAssignment: CompletionPolicy;
		allowOverride: boolean;
		allowSelfHostedCommitEvidence: boolean;
	};
}

export const DEFAULT_CONFIG: DocketConfig = {
	version: 1,
	installation: { directory: "tasks", branch: "tasks" },
	completion: {
		acceptanceCriteria: "off",
		relatedCommits: "off",
		cleanWorktree: "off",
		requireActiveAssignment: "off",
		allowOverride: true,
		allowSelfHostedCommitEvidence: false,
	},
};

export function configPath(): string {
	return process.env.DOCKET_CONFIG || join(ROOT, "docket.json");
}

function object(value: unknown, name: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new ConfigValidationError(`${name} must be an object`);
	return value as Record<string, unknown>;
}

function policy(value: unknown, name: string): CompletionPolicy {
	if (value !== "off" && value !== "agents" && value !== "all")
		throw new ConfigValidationError(`${name} must be one of: off, agents, all`);
	return value;
}

/** Read and validate the optional project configuration without dependencies. */
export function readFileConfig(path = configPath()): Partial<DocketConfig> {
	if (!existsSync(path)) return {};
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, "utf-8"));
	} catch (error) {
		throw new ConfigValidationError(
			`Invalid docket.json at ${path}: ${error instanceof Error ? error.message : error}`,
			{ cause: error },
		);
	}
	const root = object(parsed, "docket.json");
	for (const key of Object.keys(root)) {
		if (!new Set(["version", "installation", "completion"]).has(key))
			throw new ConfigValidationError(
				`docket.json contains unknown key '${key}'`,
			);
	}
	if (root.version !== 1)
		throw new ConfigValidationError("docket.json version must be 1");
	const result: Partial<DocketConfig> = { version: 1 };
	if (root.installation !== undefined) {
		const installation = object(root.installation, "installation");
		for (const key of Object.keys(installation)) {
			if (key !== "directory" && key !== "branch")
				throw new ConfigValidationError(
					`installation contains unknown key '${key}'`,
				);
		}
		if (
			installation.directory !== undefined &&
			typeof installation.directory !== "string"
		)
			throw new ConfigValidationError(
				"installation.directory must be a string",
			);
		if (
			installation.branch !== undefined &&
			typeof installation.branch !== "string"
		)
			throw new ConfigValidationError("installation.branch must be a string");
		result.installation = installation as DocketConfig["installation"];
	}
	if (root.completion !== undefined) {
		const completion = object(root.completion, "completion");
		for (const key of Object.keys(completion)) {
			if (
				!new Set([
					"acceptanceCriteria",
					"relatedCommits",
					"cleanWorktree",
					"requireActiveAssignment",
					"allowOverride",
					"allowSelfHostedCommitEvidence",
				]).has(key)
			)
				throw new ConfigValidationError(
					`completion contains unknown key '${key}'`,
				);
		}
		const policies = [
			"acceptanceCriteria",
			"relatedCommits",
			"cleanWorktree",
			"requireActiveAssignment",
		] as const;
		for (const key of policies)
			if (completion[key] !== undefined)
				policy(completion[key], `completion.${key}`);
		if (
			completion.allowOverride !== undefined &&
			typeof completion.allowOverride !== "boolean"
		)
			throw new ConfigValidationError(
				"completion.allowOverride must be a boolean",
			);
		if (
			completion.allowSelfHostedCommitEvidence !== undefined &&
			typeof completion.allowSelfHostedCommitEvidence !== "boolean"
		)
			throw new ConfigValidationError(
				"completion.allowSelfHostedCommitEvidence must be a boolean",
			);
		result.completion = completion as DocketConfig["completion"];
	}
	return result;
}

export function effectiveConfig(
	overrides: Partial<DocketConfig["installation"]> = {},
): DocketConfig {
	const file = readFileConfig();
	return {
		version: 1,
		installation: {
			directory:
				overrides.directory ??
				process.env.DOCKET_DIR ??
				file.installation?.directory ??
				DEFAULT_CONFIG.installation.directory,
			branch:
				overrides.branch ??
				process.env.DOCKET_BRANCH ??
				file.installation?.branch ??
				DEFAULT_CONFIG.installation.branch,
		},
		completion: { ...DEFAULT_CONFIG.completion, ...file.completion },
	};
}

export function policyApplies(
	policy: CompletionPolicy,
	assignment: { owner_type: "human" | "agent" } | undefined,
): boolean {
	return (
		policy === "all" ||
		(policy === "agents" && assignment?.owner_type === "agent")
	);
}
