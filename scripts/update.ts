#!/usr/bin/env bun

import { InstallerError, update } from "./installer";

try {
	await update(Bun.argv.slice(2));
} catch (error) {
	if (error instanceof InstallerError) {
		console.error(error.message);
		process.exit(error.exitCode);
	}
	throw error;
}
