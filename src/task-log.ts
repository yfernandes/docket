export interface TaskLogCommit {
	hash: string;
	subject: string;
	display_hash?: string;
}

export interface TaskLogNote {
	id: string;
	attributes: Record<string, string>;
}

/** A canonical structured note, including the authored heading and body. */
export interface StructuredTaskLogNote extends TaskLogNote {
	timestamp: string;
	kind: string;
	author: string;
	content: string;
}

export interface NewTaskLogNote {
	id: string;
	timestamp: string;
	kind: string;
	author: string;
	body: string;
	claim?: string;
	run?: string;
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
	authoredBody: string;
}

const START = "<!-- docket:task-log:start -->";
const END = "<!-- docket:task-log:end -->";
const NOTE_MARKERS = [
	START,
	END,
	"<!-- docket:note ",
	"<!-- docket:event ",
	"<!-- docket:commit ",
] as const;
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
	const nextHeading =
		heading === "### Commits"
			? "### Implementation Notes"
			: heading === "### Implementation Notes"
				? "### History"
				: null;
	if (!nextHeading) return content.length;
	const next =
		heading === "### Implementation Notes"
			? content.lastIndexOf(`\n${nextHeading}`)
			: content.indexOf(`\n${nextHeading}`, after);
	return next < after ? content.length : next;
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
	if (starts === 0 && ends === 0)
		return { log: null, errors: [], authoredBody: body };

	const errors: string[] = [];
	if (starts !== 1 || ends !== 1)
		errors.push("Task Log must contain exactly one start and end marker");
	const start = body.indexOf(START);
	const end = body.indexOf(END);
	if (start === -1 || end === -1 || end < start) {
		errors.push("Task Log markers are out of order");
		return { log: null, errors, authoredBody: body };
	}
	const taskLogHeading = body
		.slice(0, start)
		.match(/(?:^|\n)## Task Log\s*\n\s*$/);
	const authoredBody = taskLogHeading
		? body.slice(0, taskLogHeading.index).trimEnd()
		: body.slice(0, start).trimEnd();
	if (!/^## Task Log\s*$/m.test(body.slice(0, start)))
		errors.push("Task Log start marker is missing its '## Task Log' heading");
	if (body.slice(end + END.length).trim())
		errors.push("Task Log end marker must be at the end of the issue body");

	const content = body.slice(start + START.length, end);
	const commits: TaskLogCommit[] = [];
	const commitsContent = content.slice(
		content.indexOf("### Commits") + "### Commits".length,
		sectionEnd(content, "### Commits") ?? content.length,
	);
	const commitLines = commitsContent.split("\n");
	for (let index = 0; index < commitLines.length; index++) {
		const match = commitLines[index].match(/^\s*-\s+`([^`]+)`\s*(.*)$/);
		if (!match) continue;
		const displayHash = match[1];
		const metadata = commitLines[index + 1]?.match(
			/^<!--\s*docket:commit\s+hash=([^\s>]+)\s*-->$/,
		);
		if (metadata) index++;
		commits.push({
			hash: metadata?.[1] ?? displayHash,
			subject: match[2].trim(),
			...(metadata ? { display_hash: displayHash } : {}),
		});
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
	return { log: { commits, notes, history }, errors, authoredBody };
}

/**
 * Return only canonical, structured Implementation Notes. Human-authored prose
 * that does not have a Docket note marker remains authored Markdown, rather
 * than becoming an incomplete query result.
 */
export function parseStructuredTaskLogNotes(
	body: string,
): StructuredTaskLogNote[] {
	const parsed = parseTaskLog(body);
	if (!parsed.log || parsed.errors.length > 0) return [];

	const start = body.indexOf(START);
	const end = body.indexOf(END);
	const content = body.slice(start + START.length, end);
	const notesStart = content.indexOf("### Implementation Notes");
	if (notesStart === -1) return [];
	const notesEnd =
		sectionEnd(content, "### Implementation Notes") ?? content.length;
	const notesContent = content.slice(notesStart, notesEnd);
	const notes: StructuredTaskLogNote[] = [];
	const entry =
		/^####\s+(.+?)\s+—\s+(.+?)\s+—\s+(.+?)\s*\n+<!--\s*docket:note\s+([^>]*?)\s*-->\s*\n*([\s\S]*?)(?=^####\s+|(?![\s\S]))/gm;

	for (const match of notesContent.matchAll(entry)) {
		const attrs = attributes(match[4]);
		const timestamp = new Date(match[1].replace(" UTC", "Z"));
		if (!attrs?.id || Number.isNaN(timestamp.valueOf())) continue;
		notes.push({
			id: attrs.id,
			attributes: attrs,
			timestamp: timestamp.toISOString(),
			kind: attrs.kind ?? match[2].trim(),
			author: match[3].trim(),
			content: match[5].trim(),
		});
	}
	return notes;
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

export function appendNote(body: string, note: NewTaskLogNote): string {
	if (noteTextContainsTaskLogMarker(note.body))
		throw new Error("Note text must not contain Docket Task Log markers");
	const parsed = parseTaskLog(body);
	if (parsed.errors.length > 0) throw new Error(parsed.errors.join("; "));
	if (parsed.log?.notes.some((existing) => existing.id === note.id))
		return body;
	const withLog = ensureTaskLog(body);
	const end = withLog.indexOf(END);
	const attributes = [
		`id=${note.id}`,
		note.claim ? `claim=${note.claim}` : null,
		note.run ? `run=${note.run}` : null,
		`kind=${note.kind}`,
	].filter(Boolean);
	const timestamp = new Date(note.timestamp);
	const headingTimestamp = `${timestamp.toISOString().slice(0, 10)} ${timestamp.toISOString().slice(11, 16)} UTC`;
	const entry = `#### ${headingTimestamp} — ${note.kind} — ${note.author}

<!-- docket:note ${attributes.join(" ")} -->

${note.body}`;
	return `${insertInSection(withLog.slice(0, end), "### Implementation Notes", entry).trimEnd()}\n\n${withLog.slice(end)}`;
}

export function noteTextContainsTaskLogMarker(text: string): boolean {
	return NOTE_MARKERS.some((marker) => text.includes(marker));
}

export function appendCommit(body: string, commit: TaskLogCommit): string {
	const parsed = parseTaskLog(body);
	if (parsed.errors.length > 0) throw new Error(parsed.errors.join("; "));
	if (
		parsed.log?.commits.some(
			(existing) =>
				existing.hash === commit.hash || commit.hash.startsWith(existing.hash),
		)
	)
		return body;
	const withLog = ensureTaskLog(body);
	const end = withLog.indexOf(END);
	const displayHash = commit.display_hash ?? commit.hash.slice(0, 12);
	const metadata =
		displayHash === commit.hash
			? ""
			: `\n<!-- docket:commit hash=${commit.hash} -->`;
	return `${insertInSection(withLog.slice(0, end), "### Commits", `- \`${displayHash}\` ${commit.subject}${metadata}`).trimEnd()}\n\n${withLog.slice(end)}`;
}
