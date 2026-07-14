import { describe, expect, test } from "bun:test";
import {
	appendCommit,
	appendHistoryEvent,
	parseTaskLog,
} from "../src/task-log";

describe("Task Log", () => {
	test("lazily appends history without rewriting authored Markdown", () => {
		const body =
			"## Context\n\nHuman prose.\n\n### A custom heading\n\nKeep this exactly.\n";
		const result = appendHistoryEvent(body, {
			id: "claim-1",
			text: "- 2026-07-14T10:00:00.000Z — yago claimed task",
		});
		expect(result).toStartWith(body.trimEnd());
		expect(result).toEndWith("<!-- docket:task-log:end -->\n");
		expect(appendHistoryEvent(result, { id: "claim-1", text: "ignored" })).toBe(
			result,
		);
	});

	test("parses typed entries and deduplicates commits", () => {
		const first = appendCommit("Context\n", {
			hash: "abc123",
			subject: "Add log",
		});
		const result = appendCommit(first, {
			hash: "abc123",
			subject: "Duplicate",
		});
		const parsed = parseTaskLog(result);
		expect(parsed.errors).toEqual([]);
		expect(parsed.log?.commits).toEqual([
			{ hash: "abc123", subject: "Add log" },
		]);
	});

	test("reports malformed markers and duplicate event IDs", () => {
		expect(parseTaskLog("<!-- docket:task-log:start -->\n").errors).not.toEqual(
			[],
		);
		const body = `## Task Log

<!-- docket:task-log:start -->

### History

- first
<!-- docket:event id=same -->
- second
<!-- docket:event id=same -->

<!-- docket:task-log:end -->`;
		expect(parseTaskLog(body).errors).toContain("Duplicate Task Log event ID");
	});
});
