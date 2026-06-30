import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readAsset } from '$lib/server/assets';

export const GET: RequestHandler = async ({ params }) => {
	const asset = await readAsset(params.file);
	if (!asset) throw error(404, 'asset not found');
	return new Response(new Uint8Array(asset.buffer), {
		headers: {
			'content-type': asset.contentType,
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
