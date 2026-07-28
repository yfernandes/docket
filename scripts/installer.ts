import {
	appendFileSync,
	chmodSync,
	copyFileSync,
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REPO = "yfernandes/docket";
const DEFAULT_REF = "main";

const MANAGED_ROOT_FILES = [
	"task",
	"README.md",
	"RULES.md",
	"SETUP.md",
	"STRUCTURE.md",
] as const;
const MANAGED_MERGED_DIRS = ["skills", "issues/templates", "scripts"] as const;

type Environment = Record<string, string | undefined>;

export class InstallerError extends Error {
	constructor(
		message: string,
		readonly exitCode = 1,
	) {
		super(message);
	}
}

export interface SetupOptions {
	yes: boolean;
	regularBranch: boolean;
	directory: string;
	branch: string;
	config: string;
}

export interface UpdateOptions {
	yes: boolean;
}

export const SETUP_HELP = `Usage: setup.ts [--yes] [--regular-branch] [--dir <directory>] [--branch <branch>] [--config <path>]

Install docket into the current git repository as a separate worktree.

Options:
  --regular-branch
                 Create the worktree branch from the current HEAD instead of
                 creating an orphan branch

Environment:
  DOCKET_REPO     GitHub repo to install from (default: yfernandes/docket)
  DOCKET_REF      Git ref to install from (default: main)
  DOCKET_ARCHIVE_URL
                 Archive URL override for tests or mirrors
  DOCKET_DIR      Worktree directory (default: tasks)
  DOCKET_BRANCH   Worktree branch name (default: tasks)`;

export const UPDATE_HELP = `Usage: update.ts [--yes]

Update an existing docket install. This overwrites only distro-managed files:
  task
  README.md
  RULES.md
  SETUP.md
  STRUCTURE.md
  skills/
  issues/templates/
  scripts/
  fixtures/ (new bundled fixture files only)

It does not overwrite flow.md, assignments.yaml, live issues, backlog files, or
done archives.

Environment:
  DOCKET_REPO   GitHub repo to update from (default: yfernandes/docket)
  DOCKET_REF    Git ref to update from (default: main)
  DOCKET_ARCHIVE_URL
               Archive URL override for tests or mirrors
  DOCKET_DIR    Docket directory override (default: resolve from ./task or cwd)`;

function valueAfter(args: string[], index: number): string {
	const value = args[index + 1];
	if (value === undefined) {
		throw new InstallerError(`${args[index]} requires a value`, 2);
	}
	return value;
}

export function parseSetupArgs(
	args: string[],
	env: Environment = process.env,
): SetupOptions | "help" {
	const options: SetupOptions = {
		yes: false,
		regularBranch: false,
		directory: env.DOCKET_DIR || "tasks",
		branch: env.DOCKET_BRANCH || "tasks",
		config: "",
	};
	let directorySet = env.DOCKET_DIR !== undefined;
	let branchSet = env.DOCKET_BRANCH !== undefined;

	for (let index = 0; index < args.length; index += 1) {
		switch (args[index]) {
			case "-y":
			case "--yes":
				options.yes = true;
				break;
			case "-h":
			case "--help":
				return "help";
			case "--regular-branch":
				options.regularBranch = true;
				break;
			case "--dir":
				options.directory = valueAfter(args, index);
				directorySet = true;
				index += 1;
				break;
			case "--branch":
				options.branch = valueAfter(args, index);
				branchSet = true;
				index += 1;
				break;
			case "--config":
				options.config = valueAfter(args, index);
				index += 1;
				break;
			default:
				throw new InstallerError(`Unknown argument: ${args[index]}`, 2);
		}
	}

	if (options.config) {
		if (!existsSync(options.config)) {
			throw new InstallerError(
				`Configuration file does not exist: ${options.config}`,
			);
		}
		let config: {
			installation?: { directory?: string; branch?: string };
			directory?: string;
			branch?: string;
		};
		try {
			config = JSON.parse(readFileSync(options.config, "utf8"));
		} catch {
			throw new InstallerError(
				`Configuration file is not valid JSON: ${options.config}`,
			);
		}
		const installation: { directory?: string; branch?: string } =
			config.installation ?? config;
		if (!directorySet && typeof installation.directory === "string") {
			options.directory = installation.directory;
		}
		if (!branchSet && typeof installation.branch === "string") {
			options.branch = installation.branch;
		}
	}

	return options;
}

export function parseUpdateArgs(args: string[]): UpdateOptions | "help" {
	const options: UpdateOptions = { yes: false };
	for (const arg of args) {
		switch (arg) {
			case "-y":
			case "--yes":
				options.yes = true;
				break;
			case "-h":
			case "--help":
				return "help";
			default:
				throw new InstallerError(`Unknown argument: ${arg}`, 2);
		}
	}
	return options;
}

function command(
	args: string[],
	options: {
		cwd?: string;
		quiet?: boolean;
		allowFailure?: boolean;
	} = {},
): string {
	const result = Bun.spawnSync(args, {
		cwd: options.cwd,
		stdout: options.quiet ? "pipe" : "inherit",
		stderr: options.quiet ? "pipe" : "inherit",
	});
	if (result.exitCode !== 0 && !options.allowFailure) {
		const detail = options.quiet
			? (result.stderr?.toString().trim() ?? "")
			: "";
		throw new InstallerError(
			`Command failed (${args.join(" ")})${detail ? `: ${detail}` : ""}`,
			result.exitCode || 1,
		);
	}
	return result.stdout?.toString().trim() ?? "";
}

function requireCommand(name: string): void {
	const result = Bun.spawnSync(["sh", "-c", 'command -v "$1"', "sh", name], {
		stdout: "ignore",
		stderr: "ignore",
	});
	if (result.exitCode !== 0) {
		throw new InstallerError(`Missing required command: ${name}`);
	}
}

function confirm(message: string, yes: boolean): void {
	if (yes) return;
	if (!process.stdin.isTTY) {
		throw new InstallerError(
			"Refusing to continue without a TTY. Re-run with --yes to confirm.",
		);
	}
	const answer = prompt(`${message} [y/N] `);
	if (!answer || !["y", "yes"].includes(answer.toLowerCase())) {
		throw new InstallerError("Aborted.");
	}
}

function archiveUrl(env: Environment): string {
	return (
		env.DOCKET_ARCHIVE_URL ||
		`https://github.com/${env.DOCKET_REPO || DEFAULT_REPO}/archive/${env.DOCKET_REF || DEFAULT_REF}.tar.gz`
	);
}

async function extractArchive(url: string, destination: string): Promise<void> {
	const archive = join(destination, "docket.tar.gz");
	if (url.startsWith("file://")) {
		copyFileSync(fileURLToPath(url), archive);
	} else {
		const response = await fetch(url);
		if (!response.ok) {
			throw new InstallerError(
				`Download failed: ${response.status} ${response.statusText}`,
			);
		}
		await Bun.write(archive, response);
	}
	command(["tar", "-xzf", archive, "-C", destination, "--strip-components=1"]);
	rmSync(archive);
}

function copyPath(source: string, destination: string): void {
	mkdirSync(dirname(destination), { recursive: true });
	cpSync(source, destination, { recursive: true });
}

function mergeDirectory(source: string, destination: string): void {
	mkdirSync(destination, { recursive: true });
	cpSync(source, destination, { recursive: true });
}

function filesUnder(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name));
}

function executable(path: string): void {
	if (existsSync(path)) chmodSync(path, 0o755);
}

function resolveDocketDirectory(cwd: string, env: Environment): string {
	if (env.DOCKET_DIR) return resolve(cwd, env.DOCKET_DIR);
	const task = join(cwd, "task");
	if (existsSync(task) && lstatSync(task).isSymbolicLink()) {
		const target = readlinkSync(task);
		return dirname(isAbsolute(target) ? target : resolve(cwd, target));
	}
	if (
		existsSync(task) &&
		existsSync(join(cwd, "skills")) &&
		existsSync(join(cwd, "issues", "templates"))
	) {
		return cwd;
	}
	if (existsSync(join(cwd, "tasks", "task"))) return join(cwd, "tasks");
	throw new InstallerError(
		"Could not find docket. Run from the repo root or set DOCKET_DIR.",
	);
}

export async function setup(
	args: string[],
	env: Environment = process.env,
	startDirectory = process.cwd(),
): Promise<void> {
	const parsed = parseSetupArgs(args, env);
	if (parsed === "help") {
		console.log(SETUP_HELP);
		return;
	}
	requireCommand("git");
	requireCommand("tar");
	const repoRoot = command(["git", "rev-parse", "--show-toplevel"], {
		cwd: startDirectory,
		quiet: true,
	});
	if (!repoRoot) {
		throw new InstallerError(
			"Run this from inside the git repository that should receive docket.",
		);
	}
	const docketDirectory = join(repoRoot, parsed.directory);
	if (existsSync(docketDirectory)) {
		throw new InstallerError(
			`Refusing to install: ${parsed.directory} already exists.\nAn existing Docket installation must be migrated deliberately; update docket.json and move its worktree with git worktree commands rather than rerunning setup.`,
		);
	}
	const taskPath = join(repoRoot, "task");
	if (existsSync(taskPath) || lstatExists(taskPath)) {
		throw new InstallerError(
			"Refusing to install: ./task already exists.\nChanging Docket directory or branch after setup requires an explicit worktree migration; setup will not move or recreate it.",
		);
	}
	confirm(
		`Install docket into ./${parsed.directory}, create ./task symlink, and append ${parsed.directory}/ to .gitignore?`,
		parsed.yes,
	);

	const temporary = mkdtempSync(join(tmpdir(), "docket-setup-"));
	try {
		const url = archiveUrl(env);
		console.log(`Downloading ${url}`);
		await extractArchive(url, temporary);
		if (parsed.regularBranch) {
			console.log(
				`Creating regular worktree ${parsed.directory} on branch ${parsed.branch}`,
			);
			command(
				[
					"git",
					"worktree",
					"add",
					"--no-checkout",
					"-b",
					parsed.branch,
					parsed.directory,
				],
				{ cwd: repoRoot },
			);
		} else {
			console.log(
				`Creating orphan worktree ${parsed.directory} on branch ${parsed.branch}`,
			);
			command(
				[
					"git",
					"worktree",
					"add",
					"--orphan",
					"-b",
					parsed.branch,
					parsed.directory,
				],
				{ cwd: repoRoot },
			);
		}

		for (const file of [...MANAGED_ROOT_FILES, "flow.md"] as const) {
			copyPath(join(temporary, file), join(docketDirectory, file));
		}
		if (parsed.config) {
			copyPath(
				resolve(startDirectory, parsed.config),
				join(docketDirectory, "docket.json"),
			);
		} else if (existsSync(join(temporary, "docket.json"))) {
			copyPath(
				join(temporary, "docket.json"),
				join(docketDirectory, "docket.json"),
			);
		}
		for (const directory of ["skills", "scripts", "fixtures"] as const) {
			copyPath(join(temporary, directory), join(docketDirectory, directory));
		}
		copyPath(
			join(temporary, "issues", "templates"),
			join(docketDirectory, "issues", "templates"),
		);
		executable(join(docketDirectory, "task"));
		for (const script of ["setup.sh", "update.sh", "setup.ts", "update.ts"]) {
			executable(join(docketDirectory, "scripts", script));
		}
		symlinkSync(`${parsed.directory}/task`, taskPath);
		const ignorePath = join(repoRoot, ".gitignore");
		const ignored = existsSync(ignorePath)
			? readFileSync(ignorePath, "utf8").split(/\r?\n/)
			: [];
		if (!ignored.includes(`${parsed.directory}/`)) {
			appendFileSync(ignorePath, `\n${parsed.directory}/\n`);
		}
		command(["git", "add", "-A"], { cwd: docketDirectory });
		command(["git", "commit", "-m", "init: docket task system"], {
			cwd: docketDirectory,
		});
	} finally {
		rmSync(temporary, { recursive: true, force: true });
	}
	console.log("Installed docket.");
	console.log("Next steps:");
	console.log("  ./task lint");
	console.log("  ./task list");
}

function lstatExists(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

export async function update(
	args: string[],
	env: Environment = process.env,
	startDirectory = process.cwd(),
): Promise<void> {
	const parsed = parseUpdateArgs(args);
	if (parsed === "help") {
		console.log(UPDATE_HELP);
		return;
	}
	requireCommand("git");
	requireCommand("tar");
	const repoRoot =
		command(["git", "rev-parse", "--show-toplevel"], {
			cwd: startDirectory,
			quiet: true,
			allowFailure: true,
		}) || startDirectory;
	const docketDirectory = resolveDocketDirectory(repoRoot, env);
	if (!existsSync(docketDirectory)) {
		throw new InstallerError(
			`Docket directory does not exist: ${docketDirectory}`,
		);
	}
	command(["git", "rev-parse", "--is-inside-work-tree"], {
		cwd: docketDirectory,
		quiet: true,
	});
	console.error(`WARNING: this update may overwrite local changes to distro-managed docket files:
  ${docketDirectory}/task
  ${docketDirectory}/README.md
  ${docketDirectory}/RULES.md
  ${docketDirectory}/SETUP.md
  ${docketDirectory}/STRUCTURE.md
  ${docketDirectory}/skills/
  ${docketDirectory}/issues/templates/
  ${docketDirectory}/scripts/
  ${docketDirectory}/fixtures/ (new bundled fixture files only)

It will not overwrite:
  ${docketDirectory}/flow.md
  ${docketDirectory}/assignments.yaml
  ${docketDirectory}/issues/<scope>/`);
	confirm("Continue with docket update?", parsed.yes);

	const temporary = mkdtempSync(join(tmpdir(), "docket-update-"));
	try {
		const url = archiveUrl(env);
		console.log(`Downloading ${url}`);
		await extractArchive(url, temporary);
		for (const file of MANAGED_ROOT_FILES) {
			copyPath(join(temporary, file), join(docketDirectory, file));
		}
		for (const directory of MANAGED_MERGED_DIRS) {
			mergeDirectory(
				join(temporary, directory),
				join(docketDirectory, directory),
			);
		}
		const installedFixtures: string[] = [];
		for (const fixture of filesUnder(join(temporary, "fixtures"))) {
			const fixturePath = relative(join(temporary, "fixtures"), fixture);
			const destination = join(docketDirectory, "fixtures", fixturePath);
			if (existsSync(destination)) {
				console.log(`Preserving existing fixture: fixtures/${fixturePath}`);
				continue;
			}
			copyPath(fixture, destination);
			installedFixtures.push(join("fixtures", fixturePath));
		}
		executable(join(docketDirectory, "task"));
		for (const script of ["setup.sh", "update.sh", "setup.ts", "update.ts"]) {
			executable(join(docketDirectory, "scripts", script));
		}

		const stagePaths: string[] = [...MANAGED_ROOT_FILES];
		for (const directory of MANAGED_MERGED_DIRS) {
			for (const file of filesUnder(join(temporary, directory))) {
				stagePaths.push(relative(temporary, file));
			}
		}
		stagePaths.push(...installedFixtures);
		command(["git", "add", "-f", "--", ...stagePaths], {
			cwd: docketDirectory,
		});
		const clean =
			Bun.spawnSync(["git", "diff", "--cached", "--quiet"], {
				cwd: docketDirectory,
			}).exitCode === 0;
		if (clean) {
			console.log("Docket is already up to date.");
		} else {
			command(["git", "commit", "-m", "chore: update docket"], {
				cwd: docketDirectory,
			});
			console.log("Updated docket.");
		}
	} finally {
		rmSync(temporary, { recursive: true, force: true });
	}
	console.log("Verification:");
	const task = join(docketDirectory, "task");
	if (existsSync(task)) {
		command([task, "lint"], { cwd: docketDirectory, allowFailure: true });
		command([task, "doctor"], { cwd: docketDirectory, allowFailure: true });
	}
}
