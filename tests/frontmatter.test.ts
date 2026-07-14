import { describe, expect, test } from "bun:test";
import { parseFrontmatter, serializeFrontmatter } from "../src/frontmatter";

describe("frontmatter", () => {
	test("parses scalar, null, inline, and block values", () => {
		const parsed = parseFrontmatter(`---
id: ship-it
agent_id: null
tags: [cli, agents]
checks:
  - lint
  - test
---
body
`);

		expect(parsed.data).toEqual({
			id: "ship-it",
			agent_id: null,
			tags: ["cli", "agents"],
			checks: ["lint", "test"],
		});
		expect(parsed.body).toBe("body\n");
	});

	test("serializes arrays and nulls", () => {
		expect(
			serializeFrontmatter({ id: "ship-it", tags: ["cli"], closed_at: null }),
		).toBe("---\nid: ship-it\ntags: [cli]\nclosed_at: null\n---");
	});
});
