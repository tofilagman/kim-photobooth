// Tiny id generator usable on client and server (no crypto dependency needed).
export function uid(prefix = ''): string {
	const rand = Math.random().toString(36).slice(2, 8);
	const time = Date.now().toString(36).slice(-4);
	return `${prefix}${time}${rand}`;
}

export function slugify(s: string): string {
	return (
		s
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40) || 'template'
	);
}
