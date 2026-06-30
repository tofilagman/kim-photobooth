import type { Template } from '$lib/types';

// Built-in starter templates. Coordinates are normalized (0..1). These are
// written to the template store on first run if it's empty, so the booth and
// designer have something to work with immediately.

const now = 0; // stable timestamp for seeds; store stamps real time on write

export const SEED_TEMPLATES: Template[] = [
	{
		id: 'classic-strip',
		name: 'Classic Strip',
		width: 600,
		height: 1800, // 2" x 6" @ 300dpi
		background: { type: 'color', color: '#1a1a1a' },
		slots: [
			{ id: 's1', x: 0.07, y: 0.04, w: 0.86, h: 0.27, radius: 0.04 },
			{ id: 's2', x: 0.07, y: 0.345, w: 0.86, h: 0.27, radius: 0.04 },
			{ id: 's3', x: 0.07, y: 0.65, w: 0.86, h: 0.27, radius: 0.04 }
		],
		texts: [
			{ id: 't1', text: 'Kim Photobooth', x: 0.5, y: 0.95, size: 0.028, color: '#f5d76e', align: 'center', bold: true }
		],
		builtin: true,
		createdAt: now,
		updatedAt: now
	},
	{
		id: 'single-4x6',
		name: 'Single 4×6',
		width: 1800,
		height: 1200, // 6" x 4" @ 300dpi (landscape)
		background: { type: 'gradient', from: '#2b1055', to: '#7597de', angle: 135 },
		slots: [{ id: 's1', x: 0.05, y: 0.05, w: 0.9, h: 0.82, radius: 0.02 }],
		texts: [
			{ id: 't1', text: 'Kim Photobooth', x: 0.5, y: 0.94, size: 0.06, color: '#ffffff', align: 'center', bold: true }
		],
		builtin: true,
		createdAt: now,
		updatedAt: now
	},
	{
		id: 'grid-4up',
		name: '4-Up Grid',
		width: 1200,
		height: 1800, // 4" x 6" @ 300dpi (portrait)
		background: { type: 'color', color: '#0f172a' },
		slots: [
			{ id: 's1', x: 0.05, y: 0.05, w: 0.43, h: 0.41, radius: 0.03 },
			{ id: 's2', x: 0.52, y: 0.05, w: 0.43, h: 0.41, radius: 0.03 },
			{ id: 's3', x: 0.05, y: 0.49, w: 0.43, h: 0.41, radius: 0.03 },
			{ id: 's4', x: 0.52, y: 0.49, w: 0.43, h: 0.41, radius: 0.03 }
		],
		texts: [
			{ id: 't1', text: 'Kim Photobooth', x: 0.5, y: 0.955, size: 0.04, color: '#38bdf8', align: 'center', bold: true }
		],
		builtin: true,
		createdAt: now,
		updatedAt: now
	}
];
