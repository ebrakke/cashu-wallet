import type { AuthEvent } from '$lib/types';
import { type RequestHandler, error, json } from '@sveltejs/kit';
import { validateEvent, verifyEvent } from 'nostr-tools';
import { fileService } from '$lib/server/file';

export const PUT: RequestHandler = async ({ request }) => {
	const authorization = request.headers.get('authorization');
	if (!authorization) throw error(400, 'missing authorization header');
	let event: AuthEvent;
	try {
		event = await validateAuthorizationEvent(authorization);
	} catch (e) {
		throw error(400, (e as any).message);
	}
	const f = await request.blob();
	const exists = await fileService.getByFile(f);
	if (exists) {
		return json(fileService.toBlobDescriptor(exists));
	}
	const name = event.tags.find((t) => t[0] === 'name')?.[1];
	const saved = await fileService.saveFile(event.pubkey, f, name);
	return json(fileService.toBlobDescriptor(saved));
};

const validateAuthorizationEvent = async (authorization: string) => {
	const [scheme, token] = authorization.split(' ');
	if (scheme !== 'Nostr') {
		throw new Error('invalid auth scheme');
	}
	const stringifiedEvent = Buffer.from(token, 'base64').toString('utf-8');
	const jsonEvent = JSON.parse(stringifiedEvent);
	if (!validateEvent<AuthEvent>(jsonEvent)) {
		throw new Error('invalid event');
	}
	if (!verifyEvent(jsonEvent)) {
		throw new Error('invalid event signature');
	}
	if (jsonEvent.kind !== 24242) {
		throw new Error('invalid event kind');
	}
	return jsonEvent;
};
