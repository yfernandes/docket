import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./runtime";
import type { IssueFrontmatter } from "./types";

const NAME = /^[a-z][a-z0-9-]*$/;

export interface CrewRole {
	role: string;
	slots: number;
	exclusive: boolean;
}

export interface CrewFixture {
	id: string;
	description?: string;
	roles: CrewRole[];
}

export interface FixtureSlot {
	role: string;
	slot: string;
	exclusive: boolean;
}

function invalid(fixture: string, message: string): never {
	throw new Error(`Fixture '${fixture}' is invalid: ${message}`);
}

function fixturePath(id: string): string {
	if (!NAME.test(id))
		throw new Error(
			`Fixture id '${id}' must use lowercase letters, digits, and hyphens, starting with a letter.`,
		);
	return join(ROOT, "fixtures", `${id}.json`);
}

export function loadFixture(id: string): CrewFixture {
	const path = fixturePath(id);
	if (!existsSync(path))
		throw new Error(`Fixture '${id}' was not found at fixtures/${id}.json.`);

	let value: unknown;
	try {
		value = JSON.parse(readFileSync(path, "utf-8"));
	} catch (error) {
		throw new Error(
			`Fixture '${id}' could not be parsed as JSON: ${(error as Error).message}`,
		);
	}
	if (!value || typeof value !== "object" || Array.isArray(value))
		invalid(id, "the root must be a JSON object.");

	const record = value as Record<string, unknown>;
	if (record.id !== id) invalid(id, `id must equal '${id}'.`);
	if (
		record.description !== undefined &&
		typeof record.description !== "string"
	)
		invalid(id, "description must be a string when provided.");
	if (!Array.isArray(record.roles) || record.roles.length === 0)
		invalid(id, "roles must be a non-empty array.");

	const names = new Set<string>();
	const roles = record.roles.map((value, index) => {
		if (!value || typeof value !== "object" || Array.isArray(value))
			invalid(id, `roles[${index}] must be an object.`);
		const role = value as Record<string, unknown>;
		if (typeof role.role !== "string" || !NAME.test(role.role))
			invalid(
				id,
				`roles[${index}].role must use lowercase letters, digits, and hyphens, starting with a letter.`,
			);
		if (names.has(role.role)) invalid(id, `role '${role.role}' is duplicated.`);
		names.add(role.role);
		if (!Number.isInteger(role.slots) || (role.slots as number) <= 0)
			invalid(id, `roles[${index}].slots must be a positive integer.`);
		if (typeof role.exclusive !== "boolean")
			invalid(id, `roles[${index}].exclusive must be true or false.`);
		return {
			role: role.role,
			slots: role.slots as number,
			exclusive: role.exclusive,
		};
	});

	return {
		id,
		...(typeof record.description === "string"
			? { description: record.description }
			: {}),
		roles,
	};
}

export function fixtureForTask(data: IssueFrontmatter): CrewFixture | null {
	const selected = data.fixture;
	if (selected === undefined || selected === null || selected === "")
		return null;
	if (typeof selected !== "string")
		throw new Error("Task fixture must be a fixture id string.");
	return loadFixture(selected);
}

export function slotsForFixture(fixture: CrewFixture): FixtureSlot[] {
	return fixture.roles.flatMap((role) =>
		Array.from({ length: role.slots }, (_, index) => ({
			role: role.role,
			slot: `${role.role}-${index + 1}`,
			exclusive: role.exclusive,
		})),
	);
}

export function roleForFixture(
	fixture: CrewFixture,
	roleName: string,
): CrewRole | null {
	return fixture.roles.find((role) => role.role === roleName) ?? null;
}
