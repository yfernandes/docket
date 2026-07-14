export interface TaskLogCommit {
	hash: string;
	subject: string;
}

export interface TaskLogNote {
	id: string;
	attributes: Record<string, string>;
}

export interface TaskLogHistoryEvent {
	id: string;
	text: string;
}

export interface TaskLog {
	commits: TaskLogCommit[];
	notes: TaskLogNote[];
	history: TaskLogHistoryEvent[];
}

export interface ParsedTaskLog {
	log: TaskLog | null;
	errors: string[];
}

const START = "<!-- docket:task-log:start -->";
const END = "<!-- docket:task-log:end -->";
const EMPTY_LOG = `## Task Log

${START}

### Commits

### Implementation Notes

### History

${END}`;

function markerCount(body: string, marker: string): number {
	return body.split(marker).length - 1;
}

function attributes(source: string): Record<string, string> | null {
	const attrs: Record<string, string> = {};
	for (const part of source.trim().split(/\s+/)) {
		const match = part.match(/^([a-z][a-z0-9_-]*)=([^\s=]+)$/i);
		if (!match || attrs[match[1]]) return null;
		attrs[match[1]] = match[2];
	}
	return attrs;
}

function sectionEnd(content: string, heading: string): number | null {
	const start = content.indexOf(heading);
	if (start === -1) return null;
	const after = start + heading.length;
	const next = content.slice(after).match(/\n###?\s+/);
	return next?.index === undefined ? content.length : after + next.index;
}

function insertInSection(
	content: string,
	heading: string,
	entry: string,
): string {
	const end = sectionEnd(content, heading);
	if (end === null) return `${content.trimEnd()}\n\n${heading}\n\n${entry}\n`;
	return `${content.slice(0, end).trimEnd()}\n\n${entry}\n${content.slice(end)}`;
}

export function parseTaskLog(body: string): ParsedTaskLog {
	const starts = markerCount(body, START);
	const ends = markerCount(body, END);
	if (starts === 0 && ends === 0) return { log: null, errors: [] };

	const errors: string[] = [];
	if (starts !== 1 || ends !== 1)
		errors.push("Task Log must contain exactly one start and end marker");
	const start = body.indexOf(START);
	const end = body.indexOf(END);
	if (start === -1 || end === -1 || end < start) {
		errors.push("Task Log markers are out of order");
		return { log: null, errors };
	}
	if (!/^## Task Log\s*$/m.test(body.slice(0, start)))
		errors.push("Task Log start marker is missing its '## Task Log' heading");
	if (body.slice(end + END.length).trim())
		errors.push("Task Log end marker must be at the end of the issue body");

	const content = body.slice(start + START.length, end);
	const commits: TaskLogCommit[] = [];
	for (const match of content.matchAll(/^\s*-\s+`([^`]+)`\s*(.*)$/gm)) {
		commits.push({ hash: match[1], subject: match[2].trim() });
	}
	const notes: TaskLogNote[] = [];
	const history: TaskLogHistoryEvent[] = [];
	for (const match of content.matchAll(
		/<!--\s*docket:(note|event)\s+([^>]*?)\s*-->/g,
	)) {
		const attrs = attributes(match[2]);
		if (!attrs?.id) {
			errors.push(`Malformed docket:${match[1]} marker`);
			continue;
		}
		if (match[1] === "note") notes.push({ id: attrs.id, attributes: attrs });
		else {
			const before = content.slice(0, match.index).trimEnd().split("\n");
			history.push({ id: attrs.id, text: before.at(-1) ?? "" });
		}
	}
	for (const [label, values] of [
		["commit hash", commits.map((commit) => commit.hash)],
		["note ID", notes.map((note) => note.id)],
		["event ID", history.map((event) => event.id)],
	] as const) {
		if (new Set(values).size !== values.length)
			errors.push(`Duplicate Task Log ${label}`);
	}
	return { log: { commits, notes, history }, errors };
}

export function ensureTaskLog(body: string): string {
	const parsed = parseTaskLog(body);
	if (parsed.errors.length > 0) throw new Error(parsed.errors.join("; "));
	if (parsed.log) return body;
	return `${body.trimEnd()}\n\n${EMPTY_LOG}\n`;
}

export function appendHistoryEvent(
	body: string,
	event: TaskLogHistoryEvent,
): string {
	const parsed = parseTaskLog(body);
	if (parsed.errors.length > 0) throw new Error(parsed.errors.join("; "));
	if (parsed.log?.history.some((existing) => existing.id === event.id))
		return body;
	const withLog = ensureTaskLog(body);
	const end = withLog.indexOf(END);
	const content = withLog.slice(0, end);
	const suffix = withLog.slice(end);
	return `${insertInSection(content, "### History", `${event.text}\n<!-- docket:event id=${event.id} -->`).trimEnd()}\n\n${suffix}`;
}

export function appendCommit(body: string, commit: TaskLogCommit): string {
	const parsed = parseTaskLog(body);
	if (parsed.errors.length > 0) throw new Error(parsed.errors.join("; "));
	if (parsed.log?.commits.some((existing) => existing.hash === commit.hash))
		return body;
	const withLog = ensureTaskLog(body);
	const end = withLog.indexOf(END);
	return `${insertInSection(withLog.slice(0, end), "### Commits", `- \`${commit.hash}\` ${commit.subject}`).trimEnd()}\n\n${withLog.slice(end)}`;
}
