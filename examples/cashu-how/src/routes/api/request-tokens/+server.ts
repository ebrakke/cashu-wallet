import { getOrCreateServerWallet } from '$lib/server/wallet';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (request) => {
	const params = new URLSearchParams(request.url.search);
	if (!params.get('amount') || isNaN(parseInt(params.get('amount')!))) {
		return error(400, 'Invalid amount');
	}
	const wallet = await getOrCreateServerWallet();
	const amount = parseInt(params.get('amount')!);
	try {
		const token = await wallet.sendEcash(amount);
		return json({ token });
	} catch (e) {
		return error(500, 'Unable to send tokens');
	}
};
