// Photo filters. Each maps to a CSS/canvas `filter` string applied to the photo
// while it's drawn into a slot, so the frame and text stay untouched.

export interface PhotoFilter {
	id: string;
	label: string;
	css: string; // value for CanvasRenderingContext2D.filter / CSS filter
}

export const FILTERS: PhotoFilter[] = [
	{ id: 'none', label: 'Original', css: 'none' },
	{ id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.05)' },
	{ id: 'sepia', label: 'Sepia', css: 'sepia(0.8) contrast(1.02)' },
	{ id: 'warm', label: 'Warm', css: 'saturate(1.3) sepia(0.25) brightness(1.05)' },
	{ id: 'cool', label: 'Cool', css: 'hue-rotate(-12deg) saturate(1.15) brightness(1.03)' },
	{ id: 'bright', label: 'Bright', css: 'brightness(1.18) contrast(1.06)' },
	{ id: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.1)' }
];

export function filterById(id: string): PhotoFilter {
	return FILTERS.find((f) => f.id === id) ?? FILTERS[0];
}
