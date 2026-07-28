import { describe, expect, test } from "bun:test";
import {
	appendCommit,
	appendHistoryEvent,
	appendNote,
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

	test("does not duplicate a legacy abbreviated hash when recording its full hash", () => {
		const abbreviated = appendCommit("Context\n", {
			hash: "abc123",
			subject: "Legacy commit",
		});
		expect(
			appendCommit(abbreviated, {
				hash: "abc123def4567890",
				subject: "Same commit",
			}),
		).toBe(abbreviated);
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

	test("rejects note text containing managed Task Log markers", () => {
		for (const marker of [
			"<!-- docket:task-log:start -->",
			"<!-- docket:task-log:end -->",
			"<!-- docket:note id=injected -->",
			"<!-- docket:event id=injected -->",
		]) {
			expect(() =>
				appendNote("Context\n", {
					id: "note-safe",
					timestamp: "2026-07-27T12:00:00.000Z",
					kind: "comment",
					author: "codex",
					body: `Unsafe marker: ${marker}`,
				}),
			).toThrow("Note text must not contain Docket Task Log markers");
		}
	});

	test("appends after a prior note body containing Markdown headings", () => {
		const first = appendNote("Context\n", {
			id: "note-first",
			timestamp: "2026-07-27T12:00:00.000Z",
			kind: "comment",
			author: "codex",
			body: "Before heading.\n\n## Heading\n\n### History\n\nAfter heading.",
		});
		const second = appendNote(first, {
			id: "note-second",
			timestamp: "2026-07-27T12:01:00.000Z",
			kind: "decision",
			author: "codex",
			body: "Second note.",
		});

		expect(second.indexOf("After heading.")).toBeLessThan(
			second.indexOf("#### 2026-07-27 12:01 UTC"),
		);
		expect(parseTaskLog(second).errors).toEqual([]);
	});
});
