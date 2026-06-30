import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { captureStill } from '$lib/server/camera';

export const POST: RequestHandler = async () => {
	try {
		const dataUrl = await captureStill();
		return json({ dataUrl });
	} catch (e) {
		throw error(503, e instanceof Error ? e.message : 'capture failed');
	}
};
