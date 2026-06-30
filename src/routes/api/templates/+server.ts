import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listTemplates, saveTemplate } from '$lib/server/templates';
import type { Template } from '$lib/types';
import { uid, slugify } from '$lib/util';

export const GET: RequestHandler = async () => {
	return json(await listTemplates());
};

// Upsert a template. Generates an id from the name if one isn't provided.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Partial<Template>;
	if (!body.name || !Array.isArray(body.slots)) {
		throw error(400, 'name and slots are required');
	}
	const id = body.id || `${slugify(body.name)}-${uid()}`;
	const template: Template = {
		id,
		name: body.name,
		width: body.width ?? 1200,
		height: body.height ?? 1800,
		background: body.background ?? { type: 'color', color: '#1a1a1a' },
		slots: body.slots,
		texts: body.texts ?? [],
		builtin: false, // user edits/copies are never builtin
		createdAt: body.createdAt ?? Date.now(),
		updatedAt: Date.now()
	};
	return json(await saveTemplate(template));
};
