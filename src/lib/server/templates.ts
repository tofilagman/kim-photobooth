import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Template } from '$lib/types';
import { SEED_TEMPLATES } from './seeds';

// Filesystem-backed template store. One JSON file per template under data/templates.
// No database — simple, portable, and easy for Kim to back up by copying a folder.

const DATA_DIR = path.resolve('data');
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

async function ensureDir() {
	await fs.mkdir(TEMPLATES_DIR, { recursive: true });
}

let seeded = false;
async function ensureSeeded() {
	if (seeded) return;
	await ensureDir();
	const files = (await fs.readdir(TEMPLATES_DIR)).filter((f) => f.endsWith('.json'));
	if (files.length === 0) {
		const ts = Date.now();
		await Promise.all(
			SEED_TEMPLATES.map((t) => writeTemplate({ ...t, createdAt: ts, updatedAt: ts }))
		);
	}
	seeded = true;
}

function fileFor(id: string) {
	// guard against path traversal in ids
	const safe = id.replace(/[^a-zA-Z0-9_-]/g, '');
	return path.join(TEMPLATES_DIR, `${safe}.json`);
}

async function writeTemplate(t: Template) {
	await ensureDir();
	await fs.writeFile(fileFor(t.id), JSON.stringify(t, null, 2), 'utf-8');
}

export async function listTemplates(): Promise<Template[]> {
	await ensureSeeded();
	const files = (await fs.readdir(TEMPLATES_DIR)).filter((f) => f.endsWith('.json'));
	const templates = await Promise.all(
		files.map(async (f) => {
			try {
				return JSON.parse(await fs.readFile(path.join(TEMPLATES_DIR, f), 'utf-8')) as Template;
			} catch {
				return null;
			}
		})
	);
	return templates
		.filter((t): t is Template => !!t)
		.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getTemplate(id: string): Promise<Template | null> {
	await ensureSeeded();
	try {
		return JSON.parse(await fs.readFile(fileFor(id), 'utf-8')) as Template;
	} catch {
		return null;
	}
}

export async function saveTemplate(t: Template): Promise<Template> {
	await ensureSeeded();
	const ts = Date.now();
	const existing = await getTemplate(t.id);
	const merged: Template = {
		...t,
		createdAt: existing?.createdAt ?? ts,
		updatedAt: ts
	};
	await writeTemplate(merged);
	return merged;
}

export async function deleteTemplate(id: string): Promise<boolean> {
	await ensureSeeded();
	try {
		await fs.unlink(fileFor(id));
		return true;
	} catch {
		return false;
	}
}

export { DATA_DIR };
