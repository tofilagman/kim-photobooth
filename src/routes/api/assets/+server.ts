import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveAsset } from '$lib/server/assets';

// Upload an image as a base64 data URL: { dataUrl }. Returns { url }.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { dataUrl?: string };
	if (!body.dataUrl) throw error(400, 'dataUrl required');
	try {
		const url = await saveAsset(body.dataUrl);
		return json({ url });
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'upload failed');
	}
};
