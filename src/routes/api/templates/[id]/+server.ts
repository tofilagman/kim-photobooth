import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTemplate, deleteTemplate } from '$lib/server/templates';

export const GET: RequestHandler = async ({ params }) => {
	const t = await getTemplate(params.id);
	if (!t) throw error(404, 'template not found');
	return json(t);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const ok = await deleteTemplate(params.id);
	if (!ok) throw error(404, 'template not found');
	return json({ ok: true });
};
