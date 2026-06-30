import type { Template } from '$lib/types';
import { filterById } from './filters';

// Renders a template + captured photos to a canvas. The SAME function drives
// the on-screen preview and the full-resolution image sent to the printer, so
// what the guest sees is exactly what prints (WYSIWYG).
//
// Z-order: background → photos (slots) → image assets → text. Image-based
// content (background + assets) must be preloaded into `images` because canvas
// drawing is synchronous; use loadTemplateImages() to build that map.

export type Loaded = CanvasImageSource & { width: number; height: number };
export type ImageMap = Map<string, Loaded>;

/** Load a data URL / object URL / http url into an ImageBitmap. */
export async function loadImage(src: string): Promise<ImageBitmap> {
	const res = await fetch(src);
	const blob = await res.blob();
	return await createImageBitmap(blob);
}

/** Preload every image a template references (background + assets). */
export async function loadTemplateImages(t: Template): Promise<ImageMap> {
	const srcs = new Set<string>();
	if (t.background.type === 'image' && t.background.src) srcs.add(t.background.src);
	for (const a of t.assets ?? []) if (a.src) srcs.add(a.src);

	const map: ImageMap = new Map();
	await Promise.all(
		[...srcs].map(async (src) => {
			try {
				map.set(src, await loadImage(src));
			} catch {
				/* skip broken image */
			}
		})
	);
	return map;
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

const rad = (deg: number) => ((deg ?? 0) * Math.PI) / 180;

function paintBackground(ctx: CanvasRenderingContext2D, t: Template, images: ImageMap) {
	const { width: W, height: H } = t;
	if (t.background.type === 'image') {
		const img = images.get(t.background.src);
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, W, H);
		if (img) {
			const fit = t.background.fit ?? 'cover';
			const scale =
				fit === 'cover'
					? Math.max(W / img.width, H / img.height)
					: Math.min(W / img.width, H / img.height);
			const dw = img.width * scale;
			const dh = img.height * scale;
			ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
		}
		return;
	}
	if (t.background.type === 'gradient') {
		const a = rad(t.background.angle ?? 0);
		const x = Math.cos(a);
		const y = Math.sin(a);
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
	photos: (Loaded | null)[],
	filterId = 'none',
	images: ImageMap = new Map()
) {
	const { width: W, height: H } = t;
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, W, H);
	paintBackground(ctx, t, images);

	const filterCss = filterById(filterId).css;

	// photos into slots (rotated, clipped, cover-fit, centered)
	t.slots.forEach((slot, i) => {
		const sw = slot.w * W;
		const sh = slot.h * H;
		const cx = (slot.x + slot.w / 2) * W;
		const cy = (slot.y + slot.h / 2) * H;
		const r = (slot.radius ?? 0) * Math.min(sw, sh);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(rad(slot.rotation ?? 0));
		roundRectPath(ctx, -sw / 2, -sh / 2, sw, sh, r);
		ctx.clip();

		const photo = photos[i];
		if (photo) {
			ctx.filter = filterCss;
			const scale = Math.max(sw / photo.width, sh / photo.height);
			const dw = photo.width * scale;
			const dh = photo.height * scale;
			ctx.drawImage(photo, -dw / 2, -dh / 2, dw, dh);
			ctx.filter = 'none';
		} else {
			ctx.fillStyle = 'rgba(255,255,255,0.08)';
			ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
		}
		ctx.restore();
	});

	// image assets (stickers / overlays) above photos
	for (const a of t.assets ?? []) {
		const img = images.get(a.src);
		if (!img) continue;
		const aw = a.w * W;
		const ah = a.h * H;
		const cx = (a.x + a.w / 2) * W;
		const cy = (a.y + a.h / 2) * H;
		ctx.save();
		ctx.globalAlpha = a.opacity ?? 1;
		ctx.translate(cx, cy);
		ctx.rotate(rad(a.rotation ?? 0));
		ctx.drawImage(img, -aw / 2, -ah / 2, aw, ah);
		ctx.restore();
	}

	// text on top
	for (const tx of t.texts) {
		const size = tx.size * H;
		ctx.save();
		ctx.translate(tx.x * W, tx.y * H);
		ctx.rotate(rad(tx.rotation ?? 0));
		ctx.font = `${tx.bold ? '700 ' : ''}${size}px ${tx.font ?? 'system-ui, sans-serif'}`;
		ctx.fillStyle = tx.color;
		ctx.textAlign = tx.align ?? 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(tx.text, 0, 0);
		ctx.restore();
	}
}
