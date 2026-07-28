export const PROTOCOL_VERSION = 1 as const;

/**
 * Stable CLI exit classes:
 * 0 success (including empty selections), 1 domain/validation,
 * 2 malformed usage or missing non-interactive input, 3 operational failure.
 */
export const EXIT_CODES = {
	success: 0,
	domain: 1,
	usage: 2,
	operational: 3,
} as const;

export type ExitClass = keyof typeof EXIT_CODES;

export type ErrorCode =
	| "INVALID_USAGE"
	| "MISSING_INPUT"
	| "TASK_NOT_FOUND"
	| "AMBIGUOUS_TASK_ID"
	| "TASK_ALREADY_CLAIMED"
	| "TASK_NOT_CLAIMABLE"
	| "NO_ACTIVE_ASSIGNMENT"
	| "CLAIM_MISMATCH"
	| "INVALID_STATUS"
	| "TEMPLATE_NOT_FOUND"
	| "CONFIG_INVALID"
	| "COMPLETION_BLOCKED"
	| "TAKE_LOCK_HELD"
	| "BACKEND_UNAVAILABLE"
	| "INVALID_BACKEND_RESPONSE"
	| "VALIDATION_FAILED"
	| "DOMAIN_ERROR"
	| "OPERATIONAL_ERROR";

export class ProtocolError extends Error {
	constructor(
		public readonly code: ErrorCode,
		message: string,
		public readonly exitClass: Exclude<ExitClass, "success">,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "ProtocolError";
	}
}

export class ConfigValidationError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ConfigValidationError";
	}
}

let jsonMode = false;

export function isJsonMode(): boolean {
	return jsonMode;
}

export function usageError(
	message: string,
	code: ErrorCode = "INVALID_USAGE",
	details?: Record<string, unknown>,
): never {
	throw new ProtocolError(code, message, "usage", details);
}

export function domainError(
	message: string,
	code: ErrorCode = "DOMAIN_ERROR",
	details?: Record<string, unknown>,
): never {
	throw new ProtocolError(code, message, "domain", details);
}

export function operationalError(
	message: string,
	code: ErrorCode = "OPERATIONAL_ERROR",
	details?: Record<string, unknown>,
): never {
	throw new ProtocolError(code, message, "operational", details);
}

function messageFor(value: unknown): string {
	return value instanceof Error ? value.message : String(value);
}

function classify(error: unknown): ProtocolError {
	if (error instanceof ProtocolError) return error;
	const message = messageFor(error);
	if (error instanceof ConfigValidationError)
		return new ProtocolError("CONFIG_INVALID", message, "domain");
	return new ProtocolError("OPERATIONAL_ERROR", message, "operational");
}

function line(value: unknown): string {
	return typeof value === "string" ? value : String(value);
}

export async function runCommand(
	command: string,
	json: boolean,
	action: () => Promise<unknown>,
): Promise<number> {
	if (!json) {
		try {
			await action();
			return EXIT_CODES.success;
		} catch (error) {
			const failure = classify(error);
			console.error(failure.message);
			return EXIT_CODES[failure.exitClass];
		}
	}

	jsonMode = true;
	const warnings: string[] = [];
	const originalLog = console.log;
	const originalWarn = console.warn;
	const originalError = console.error;
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);

	console.log = () => {};
	console.warn = (...values: unknown[]) =>
		warnings.push(values.map(line).join(" "));
	console.error = (...values: unknown[]) =>
		warnings.push(values.map(line).join(" "));
	process.stdout.write = (() => true) as typeof process.stdout.write;
	process.stderr.write = ((chunk: string | Uint8Array) => {
		const text =
			typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
		warnings.push(...text.split("\n").filter(Boolean));
		return true;
	}) as typeof process.stderr.write;

	let document: Record<string, unknown>;
	let exitCode = EXIT_CODES.success;
	try {
		const data = await action();
		document = {
			protocol_version: PROTOCOL_VERSION,
			ok: true,
			command,
			data: data ?? {},
			warnings,
		};
	} catch (error) {
		const failure = classify(error);
		exitCode = EXIT_CODES[failure.exitClass];
		document = {
			protocol_version: PROTOCOL_VERSION,
			ok: false,
			command,
			error: {
				code: failure.code,
				message: failure.message,
				...(failure.details ? { details: failure.details } : {}),
			},
			...(warnings.length > 0 ? { warnings } : {}),
		};
	} finally {
		console.log = originalLog;
		console.warn = originalWarn;
		console.error = originalError;
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
		jsonMode = false;
	}

	originalStdoutWrite(`${JSON.stringify(document, null, 2)}\n`);
	return exitCode;
}
