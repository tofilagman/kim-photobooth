import type { Template } from '$lib/types';
import { filterById } from './filters';

// Renders a template + captured photos to a canvas. The SAME function drives
// the on-screen preview and the full-resolution image sent to the printer, so
// what the guest sees is exactly what prints (WYSIWYG).

export type PhotoInput = CanvasImageSource & { width: number; height: number };

/** Load a data URL / object URL into an ImageBitmap (decoded off the main thread). */
export async function loadImage(src: string): Promise<ImageBitmap> {
	const res = await fetch(src);
	const blob = await res.blob();
	return await createImageBitmap(blob);
}

function roundRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}

function paintBackground(ctx: CanvasRenderingContext2D, t: Template) {
	const { width: W, height: H } = t;
	if (t.background.type === 'gradient') {
		const angle = ((t.background.angle ?? 0) * Math.PI) / 180;
		const x = Math.cos(angle);
		const y = Math.sin(angle);
		const g = ctx.createLinearGradient(
			W / 2 - (x * W) / 2,
			H / 2 - (y * H) / 2,
			W / 2 + (x * W) / 2,
			H / 2 + (y * H) / 2
		);
		g.addColorStop(0, t.background.from);
		g.addColorStop(1, t.background.to);
		ctx.fillStyle = g;
	} else {
		ctx.fillStyle = t.background.color;
	}
	ctx.fillRect(0, 0, W, H);
}

/**
 * Draw the composed result onto `canvas`, sized to the template's output px.
 * `photos[i]` fills `template.slots[i]`. Missing photos leave a placeholder.
 */
export function renderTemplate(
	canvas: HTMLCanvasElement,
	t: Template,
	photos: ((CanvasImageSource & { width: number; height: number }) | null)[],
	filterId = 'none'
) {
	const { width: W, height: H } = t;
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, W, H);
	paintBackground(ctx, t);

	const filterCss = filterById(filterId).css;

	t.slots.forEach((slot, i) => {
		const sx = slot.x * W;
		const sy = slot.y * H;
		const sw = slot.w * W;
		const sh = slot.h * H;
		const r = (slot.radius ?? 0) * Math.min(sw, sh);

		ctx.save();
		roundRectPath(ctx, sx, sy, sw, sh, r);
		ctx.clip();

		const photo = photos[i];
		if (photo) {
			ctx.filter = filterCss;
			// object-fit: cover
			const scale = Math.max(sw / photo.width, sh / photo.height);
			const dw = photo.width * scale;
			const dh = photo.height * scale;
			ctx.drawImage(photo, sx + (sw - dw) / 2, sy + (sh - dh) / 2, dw, dh);
			ctx.filter = 'none';
		} else {
			// empty slot placeholder
			ctx.fillStyle = 'rgba(255,255,255,0.08)';
			ctx.fillRect(sx, sy, sw, sh);
		}
		ctx.restore();
	});

	// text decorations on top
	for (const tx of t.texts) {
		const size = tx.size * H;
		ctx.font = `${tx.bold ? '700 ' : ''}${size}px ${tx.font ?? 'system-ui, sans-serif'}`;
		ctx.fillStyle = tx.color;
		ctx.textAlign = tx.align ?? 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(tx.text, tx.x * W, tx.y * H);
	}
}
