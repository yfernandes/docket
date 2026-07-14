#!/usr/bin/env bun
// vim: set filetype=typescript :

import {
	cmdClaim,
	cmdClose,
	cmdDoctor,
	cmdIngest,
	cmdLint,
	cmdList,
	cmdNew,
	cmdRelease,
	cmdRender,
	cmdTriage,
} from "./commands";

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
  doctor                    Expire stale leases, warn on drift
  render                    Rebuild flow.md Active / Agent Queue
  list                      List issues (filterable)
    --status <s>            Filter by status
    --scope <s>             Filter by scope
    --owner <s>             Filter by owner
    --tag <t>               Filter by tag
    --json                  JSON output
  ingest                    Process Issue Scratchpad via AI
    --backend <name>        Force backend: gemini, claude, copilot, codex, api
                            (default: auto-detect from PATH, fallback to api)
    --template <name>       Use issues/templates/<name>.md (default: issue)
`;

export async function main(args = process.argv.slice(2)): Promise<void> {
	const [cmd, ...rest] = args;

	switch (cmd) {
		case "lint":
			await cmdLint();
			break;
		case "new":
			await cmdNew(rest);
			break;
		case "claim":
			await cmdClaim(rest);
			break;
		case "triage":
			await cmdTriage(rest);
			break;
		case "release":
			await cmdRelease(rest);
			break;
		case "close":
			await cmdClose(rest);
			break;
		case "doctor":
			await cmdDoctor();
			break;
		case "render":
			await cmdRender();
			break;
		case "list":
			await cmdList(rest);
			break;
		case "ingest":
			await cmdIngest(rest);
			break;
		case "help":
		case undefined:
			console.log(HELP);
			break;
		default:
			console.error(`Unknown command: ${cmd}`);
			console.log(HELP);
			process.exit(1);
	}
}

if (import.meta.path === Bun.main) {
	await main();
}
