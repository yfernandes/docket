#!/usr/bin/env bun

import { InstallerError, setup } from "./installer";

try {
	await setup(Bun.argv.slice(2));
} catch (error) {
	if (error instanceof InstallerError) {
		console.error(error.message);
		process.exit(error.exitCode);
	}
	throw error;
}
