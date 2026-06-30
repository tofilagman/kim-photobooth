import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

// Tethered DSLR control via gphoto2. Functional when a supported camera is
// connected over USB; degrades gracefully (status reports unavailable) when
// it isn't, so the booth can fall back to the webcam source.
//
// NOTE: on desktop Linux, the GVFS gphoto2 volume monitor can grab the camera
// and block gphoto2. If capture fails with "Could not claim the USB device",
// stop gvfs-gphoto2-volume-monitor (or run the booth on a headless session).

export interface CameraStatus {
	available: boolean;
	model?: string;
	error?: string;
}

export async function detectCamera(): Promise<CameraStatus> {
	try {
		const { stdout } = await execFileP('gphoto2', ['--auto-detect'], { timeout: 8000 });
		const lines = stdout
			.split('\n')
			.slice(2) // skip header rows
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length === 0) return { available: false, error: 'no camera detected' };
		const model = lines[0].replace(/\s{2,}\S+$/, '').trim();
		return { available: true, model };
	} catch (e) {
		return { available: false, error: e instanceof Error ? e.message : String(e) };
	}
}

/** Capture a full-resolution still and return it as a JPEG data URL. */
export async function captureStill(): Promise<string> {
	const tmp = path.join(os.tmpdir(), `kimbooth-${Date.now()}.jpg`);
	try {
		await execFileP(
			'gphoto2',
			['--capture-image-and-download', '--filename', tmp, '--force-overwrite'],
			{ timeout: 20000 }
		);
		const buf = await fs.readFile(tmp);
		return `data:image/jpeg;base64,${buf.toString('base64')}`;
	} finally {
		fs.unlink(tmp).catch(() => {});
	}
}
