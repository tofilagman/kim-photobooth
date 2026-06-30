import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPrinters } from '$lib/server/print';

export const GET: RequestHandler = async () => {
	return json(await listPrinters());
};
