import type { AuthEvent } from '$lib/types';
import { type RequestHandler, error, json } from '@sveltejs/kit';
import { validateEvent, verifyEvent } from 'nostr-tools';
import { fileService } from '$lib/server/file';
import { Auth } from '$lib/server/auth';
import { getDecodedToken, getTokenAmount } from '@cashu-wallet/core';
import { getOrCreateServerWallet } from '$lib/server/wallet';

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const event = await Auth.validAuthEvent(request.headers);
		const ecash = request.headers.get('X-Cashu');
		if (!ecash) {
			throw error(402, 'payment required');
		}
		const f = await request.blob();
		const feeAmount = Math.floor(f.size / 1024);
		const tokenAmount = getTokenAmount(getDecodedToken(ecash));
		if (tokenAmount < feeAmount) {
			throw error(402, 'insufficient amount');
		}
		const wallet = await getOrCreateServerWallet();
		await wallet.receiveEcash(ecash);
		const exists = await fileService.getByFile(f);
		if (exists) {
			return json(fileService.toBlobDescriptor(exists));
		}
		const name = event.tags.find((t) => t[0] === 'name')?.[1];
		const saved = await fileService.saveFile(event.pubkey, f, name);
		return json(fileService.toBlobDescriptor(saved));
	} catch (e) {
		console.error(e);
		throw error(400, (e as any).message);
	}
};
