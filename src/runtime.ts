import { basename, dirname } from "node:path";

// Source runs from src/, while the bundled artifact lives at the docket root.
export const ROOT =
	basename(import.meta.dir) === "src"
		? dirname(import.meta.dir)
		: import.meta.dir;
