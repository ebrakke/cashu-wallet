import { fileService } from '$lib/server/file';
import { error, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const { sha256 } = params;
	if (!sha256) return error(400, 'missing hash');
	const file = await fileService.getByHash(sha256);
	if (!file) return error(404, 'file not found');
	const buffer = await fileService.loadFile(file);
	return new Response(buffer, {
		headers: {
			'Content-Type': file.type ?? 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${file.name ?? file.hash}"`
		}
	});
};
