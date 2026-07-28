#!/usr/bin/env bun
// vim: set filetype=typescript :

import {
	cmdClaim,
	cmdClose,
	cmdCommits,
	cmdConfig,
	cmdDoctor,
	cmdIngest,
	cmdLint,
	cmdList,
	cmdNew,
	cmdNote,
	cmdRelease,
	cmdRender,
	cmdShow,
	cmdTriage,
} from "./commands";
import { domainError, runCommand, usageError } from "./protocol";

// ── Main dispatch ─────────────────────────────────────────────────────────────

export const HELP = `task — file-based task orchestration

Commands:
  lint                      Validate task system invariants
  new <scope> <title>       Create a new issue from template
    --template <name>       Use issues/templates/<name>.md (default: issue)
  claim <task-id>           Claim a task
    --owner <name>          Owner name
    --agent <agent-id>      Marks as agent (requires --lease)
    --worktree <path>       Worktree path
    --branch <name>         Branch name
    --lease <minutes>       Lease duration (required for agents)
  triage <task-id> <status> Update issue triage status
  release <task-id>         Release a task back to open
    --reason <note>         Optional reason
  close <task-id>           Mark done and archive
    --wontfix              Archive as wontfix instead of done
    --commit <hash>         Record validated implementation evidence
    --force --reason <text> Override configured completion gates
  config [path|validate]    Show or validate docket.json configuration
  doctor                    Expire stale leases, warn on drift
  render                    Rebuild flow.md Active / Agent Queue
  list                      List issues (filterable)
    --status <s>            Filter by status
    --scope <s>             Filter by scope
    --owner <s>             Filter by owner
    --tag <t>               Filter by tag
    --json                  JSON output
  show <task-id>            Show complete task context
    --json                  JSON output
  note <task-id> [text]     Append a durable implementation note
    --kind <kind>           Note kind (default: comment; custom kinds allowed)
    --author <name>         Note author (defaults to active owner)
    --claim <claim-id>      Optional claim attribution
    --run <run-id>          Optional run attribution
    --stdin                 Read note text from stdin
    --json                  JSON output
  commits list <task-id>    List recorded implementation commits
  commits add <task-id> <hash>...
                            Record explicit implementation commits
  commits detect <task-id>  Detect commits since an agent claim's base commit
  ingest                    Process Issue Scratchpad via AI
    --backend <name>        Force backend: gemini, claude, copilot, codex, api
                            (default: auto-detect from PATH, fallback to api)
    --template <name>       Use issues/templates/<name>.md (default: issue)

Global options:
  --json                    Emit one versioned JSON document (non-interactive)
`;

export async function main(args = process.argv.slice(2)): Promise<void> {
	const json = args.includes("--json");
	const filteredArgs = args.filter((arg) => arg !== "--json");
	const [cmd, ...rest] = filteredArgs;
	const command = cmd ?? "help";
	const exitCode = await runCommand(command, json, async () => {
		switch (cmd) {
			case "lint":
				return cmdLint();
			case "new":
				return cmdNew(rest);
			case "claim":
				return cmdClaim(rest);
			case "triage":
				return cmdTriage(rest);
			case "release":
				return cmdRelease(rest);
			case "close":
				return cmdClose(rest);
			case "config":
				return cmdConfig(rest);
			case "doctor":
				return cmdDoctor();
			case "render":
				return cmdRender();
			case "list":
				return cmdList(rest);
			case "show":
				return cmdShow(rest);
			case "note":
				return cmdNote(rest);
			case "commits":
				return cmdCommits(rest);
			case "ingest":
				return cmdIngest(rest);
			case "help":
			case undefined:
				console.log(HELP);
				return { help: HELP };
			default:
				if (!json) {
					console.log(HELP);
					domainError(`Unknown command: ${cmd}`);
				}
				usageError(`Unknown command: ${cmd}`, "INVALID_USAGE", {
					command: cmd,
				});
		}
	});
	if (exitCode !== 0) {
		process.exitCode = exitCode;
	}
}

if (import.meta.path === Bun.main) {
	await main();
}
