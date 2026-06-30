import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveCapture, printFile } from '$lib/server/print';

// Save the composed image to disk and (optionally) send it to a printer.
// Body: { dataUrl, copies?, printer?, name?, print? }
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		dataUrl?: string;
		copies?: number;
		printer?: string;
		name?: string;
		print?: boolean;
	};
	if (!body.dataUrl) throw error(400, 'dataUrl required');

	let savedPath: string;
	try {
		savedPath = await saveCapture(body.dataUrl, body.name);
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'could not save image');
	}

	let printJob: string | null = null;
	if (body.print !== false) {
		try {
			printJob = await printFile(savedPath, {
				printer: body.printer,
				copies: body.copies ?? 1
			});
		} catch (e) {
			// Saved successfully but printing failed — report both.
			return json(
				{ saved: savedPath, printed: false, error: e instanceof Error ? e.message : String(e) },
				{ status: 502 }
			);
		}
	}

	return json({ saved: savedPath, printed: body.print !== false, printJob });
};
