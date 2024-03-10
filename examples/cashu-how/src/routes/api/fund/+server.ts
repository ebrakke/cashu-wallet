import { getOrCreateServerWallet } from '$lib/server/wallet';
import { getDecodedToken, getTokenMint } from '@cashu-wallet/core';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, ...rest }) => {
	const token = await request.text();
	const wallet = await getOrCreateServerWallet();
	const tokenMint = getTokenMint(getDecodedToken(token));
	if (tokenMint !== wallet.mintUrl) {
		await wallet.swap(token);
	} else {
		await wallet.receiveEcash(token);
	}
	return json({ message: 'Thank you!' });
};
