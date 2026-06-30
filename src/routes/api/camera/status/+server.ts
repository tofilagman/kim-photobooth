import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectCamera } from '$lib/server/camera';

export const GET: RequestHandler = async () => {
	const status = await detectCamera();
	return json(status, { status: status.available ? 200 : 503 });
};
