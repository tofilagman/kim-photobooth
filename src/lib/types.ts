// Core domain model for Kim Photobooth.
//
// All geometry is stored in NORMALIZED coordinates (0..1) relative to the
// template's output canvas. This makes templates resolution-independent: the
// designer manipulates a scaled-down preview, while the booth renders at full
// print resolution (`width` x `height`). Multiply a normalized value by the
// real pixel size to get device pixels.

export type Background =
	| { type: 'color'; color: string }
	| { type: 'gradient'; from: string; to: string; angle?: number };

/** A rectangular region a captured photo is drawn into (object-fit: cover). */
export interface Slot {
	id: string;
	x: number; // 0..1, left
	y: number; // 0..1, top
	w: number; // 0..1, width
	h: number; // 0..1, height
	radius?: number; // corner radius as fraction of min(width,height) px, 0..0.5
}

/** A static text decoration drawn on top of the photos. */
export interface TextDeco {
	id: string;
	text: string;
	x: number; // 0..1, anchor x
	y: number; // 0..1, anchor y (baseline-ish, see compose)
	size: number; // font size as fraction of canvas height (e.g. 0.05)
	color: string;
	align?: CanvasTextAlign; // default 'center'
	bold?: boolean;
	font?: string; // css font family, default system
}

export interface Template {
	id: string;
	name: string;
	width: number; // output pixels (e.g. 1200 for 4" @ 300dpi)
	height: number; // output pixels
	background: Background;
	slots: Slot[]; // number of photos to capture === slots.length
	texts: TextDeco[];
	builtin?: boolean; // seeded default; can be reset
	createdAt: number;
	updatedAt: number;
}

/** Convenience: how many photos a template asks the guest to take. */
export function photoCount(t: Template): number {
	return t.slots.length;
}
