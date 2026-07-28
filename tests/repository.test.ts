import { describe, expect, test } from "bun:test";
import { parseAssignmentsYaml, serializeAssignments } from "../src/repository";

describe("assignment storage", () => {
	test("round trips assignment records", () => {
		const yaml = `- task_id: agent-loop
  status: active
  owner: codex
  owner_type: agent
  agent_id: codex-1
  worktree: null
  branch: agent-loop
  claimed_at: 2026-07-13T12:00:00.000Z
  lease_until: 2026-07-13T14:00:00.000Z
  released_at: null
`;

		const assignments = parseAssignmentsYaml(yaml);
		expect(assignments).toHaveLength(1);
		expect(assignments[0]?.task_id).toBe("agent-loop");
		expect(assignments[0]?.owner_type).toBe("agent");
		expect(serializeAssignments(assignments)).toBe(yaml);
	});

	test("round trips completed participant attribution while keeping legacy fields optional", () => {
		const yaml = `- task_id: reviewable-task
  status: completed
  owner: reviewer-1
  owner_type: agent
  agent_id: reviewer-1
  assignment_type: participant
  role: reviewer
  slot: review-1
  run_id: cycle-a
  worktree: /tmp/reviewer-1
  branch: review/task
  claim_id: claim-review-1
  base_commit: abc123
  claimed_at: 2026-07-28T10:00:00.000Z
  lease_until: 2026-07-28T11:00:00.000Z
  completed_at: 2026-07-28T10:30:00.000Z
  released_at: null
  outcome: approved
  note_id: note-review-1
`;

		const assignment = parseAssignmentsYaml(yaml).at(0);
		if (!assignment) throw new Error("Expected a participant assignment");
		expect(assignment).toMatchObject({
			assignment_type: "participant",
			role: "reviewer",
			slot: "review-1",
			run_id: "cycle-a",
			status: "completed",
			outcome: "approved",
			note_id: "note-review-1",
		});
		expect(serializeAssignments([assignment])).toBe(yaml);
	});
});
