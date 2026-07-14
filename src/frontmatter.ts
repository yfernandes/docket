// ── YAML frontmatter ──────────────────────────────────────────────────────────

export function parseFrontmatter(content: string): {
	data: Record<string, unknown>;
	body: string;
} {
	const lines = content.split("\n");
	if (lines[0] !== "---") return { data: {}, body: content };
	const endIdx = lines.indexOf("---", 1);
	if (endIdx === -1) return { data: {}, body: content };

	const data: Record<string, unknown> = {};
	const yamlLines = lines.slice(1, endIdx);
	let i = 0;

	while (i < yamlLines.length) {
		const line = yamlLines[i];
		const m = line.match(/^([\w_-]+)\s*:\s*(.*)/);
		if (!m) {
			i++;
			continue;
		}
		const [, key, rawVal] = m;
		const val = rawVal.trim();

		if (val === "") {
			// block sequence: collect "  - value" lines
			const items: string[] = [];
			i++;
			while (i < yamlLines.length && /^[ \t]/.test(yamlLines[i])) {
				const item = yamlLines[i].replace(/^\s*-\s*/, "").trim();
				if (item) items.push(item);
				i++;
			}
			data[key] = items;
			continue;
		}

		if (val === "null") data[key] = null;
		else if (val.startsWith("[")) {
			// inline array: [a, b, c]
			const inner = val.slice(1, val.lastIndexOf("]"));
			data[key] = inner
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else {
			data[key] = val;
		}
		i++;
	}

	return { data, body: lines.slice(endIdx + 1).join("\n") };
}

export function serializeFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ["---"];
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) lines.push(`${key}: [${value.join(", ")}]`);
		else if (value === null) lines.push(`${key}: null`);
		else lines.push(`${key}: ${value}`);
	}
	lines.push("---");
	return lines.join("\n");
}
