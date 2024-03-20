import { fileService } from '$lib/server/file';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const { pubkey } = params;
	if (!pubkey) return error(400, 'missing pubkey');
	const files = await fileService.listByPubkey(pubkey);
	return json(files);
};
