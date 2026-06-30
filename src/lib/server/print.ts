import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DATA_DIR } from './templates';

const execFileP = promisify(execFile);
const CAPTURES_DIR = path.join(DATA_DIR, 'captures');

/** Decode a data URL into a Buffer + file extension. */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
	const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl);
	if (!m) throw new Error('unsupported data URL');
	const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
	return { buffer: Buffer.from(m[2], 'base64'), ext: ext === 'jpeg' ? 'jpg' : 'png' };
}

/** Persist a composed image to data/captures and return its absolute path. */
export async function saveCapture(dataUrl: string, name = 'photo'): Promise<string> {
	await fs.mkdir(CAPTURES_DIR, { recursive: true });
	const { buffer, ext } = decodeDataUrl(dataUrl);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const safe = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'photo';
	const file = path.join(CAPTURES_DIR, `${stamp}_${safe}.${ext}`);
	await fs.writeFile(file, buffer);
	return file;
}

export interface Printer {
	name: string;
	enabled: boolean;
	status: string;
}

/** List CUPS printers via lpstat. */
export async function listPrinters(): Promise<Printer[]> {
	try {
		const { stdout } = await execFileP('lpstat', ['-p']);
		return stdout
			.split('\n')
			.filter((l) => l.startsWith('printer '))
			.map((l) => {
				const name = l.split(/\s+/)[1] ?? '';
				const enabled = !/disabled/i.test(l);
				return { name, enabled, status: l.trim() };
			})
			.filter((p) => p.name);
	} catch {
		return [];
	}
}

/** Send a file to a CUPS printer via lp. Returns the lp job output. */
export async function printFile(
	file: string,
	opts: { printer?: string; copies?: number } = {}
): Promise<string> {
	const args: string[] = [];
	if (opts.printer) args.push('-d', opts.printer);
	if (opts.copies && opts.copies > 1) args.push('-n', String(opts.copies));
	// fit-to-page so prints fill the photo paper
	args.push('-o', 'fit-to-page', file);
	const { stdout } = await execFileP('lp', args);
	return stdout.trim();
}
