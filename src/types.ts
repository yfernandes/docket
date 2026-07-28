// ── Types ─────────────────────────────────────────────────────────────────────

export interface IssueFrontmatter {
	id: string;
	title?: string;
	status:
		| "open"
		| "in-progress"
		| "done"
		| "blocked"
		| "needs-triage"
		| "needs-info"
		| "ready-for-agent"
		| "ready-for-human"
		| "wontfix";
	priority: "P1" | "P2" | "P3" | "P4";
	owner?: string;
	owner_type?: "human" | "agent";
	agent_id?: string | null;
	tags: string[];
	created_at: string;
	closed_at?: string | null;
	[key: string]: unknown;
}

export interface Assignment {
	task_id: string;
	status: "active" | "released" | "expired";
	owner: string;
	owner_type: "human" | "agent";
	agent_id: string | null;
	worktree: string | null;
	branch: string | null;
	base_commit?: string | null;
	claimed_at: string;
	lease_until: string | null;
	released_at: string | null;
}
