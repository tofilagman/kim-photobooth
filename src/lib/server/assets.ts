import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './templates';
import { uid } from '$lib/util';

// Uploaded image storage (backgrounds, stickers, logos). Files live under
// data/assets and are referenced from templates by the URL /api/assets/<file>.

const ASSETS_DIR = path.join(DATA_DIR, 'assets');

const EXT_BY_MIME: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif'
};
const MIME_BY_EXT: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif'
};

/** Decode a base64 image data URL, save it, and return its public URL. */
export async function saveAsset(dataUrl: string): Promise<string> {
	const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
	if (!m) throw new Error('expected a base64 data URL');
	const ext = EXT_BY_MIME[m[1].toLowerCase()];
	if (!ext) throw new Error(`unsupported image type: ${m[1]}`);
	await fs.mkdir(ASSETS_DIR, { recursive: true });
	const file = `${uid('a')}.${ext}`;
	await fs.writeFile(path.join(ASSETS_DIR, file), Buffer.from(m[2], 'base64'));
	return `/api/assets/${file}`;
}

export async function readAsset(
	file: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
	const safe = path.basename(file); // strip any path traversal
	const ext = safe.split('.').pop()?.toLowerCase() ?? '';
	const contentType = MIME_BY_EXT[ext];
	if (!contentType) return null;
	try {
		const buffer = await fs.readFile(path.join(ASSETS_DIR, safe));
		return { buffer, contentType };
	} catch {
		return null;
	}
}
