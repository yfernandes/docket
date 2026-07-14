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
});
