import type { AuthEvent } from '$lib/types';
import { validateEvent, verifyEvent } from 'nostr-tools';

const now = () => Math.floor(Date.now() / 1000);

export class Auth {
	static async validAuthEvent(headers: Headers): Promise<AuthEvent> {
		const authorization = headers.get('authorization');
		if (!authorization) throw new Error('missing authorization header');
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
		const expiration = jsonEvent.tags.find((t) => t[0] === 'expiration')?.[1];
		if (!expiration || parseInt(expiration) < now()) {
			throw new Error('auth expired event');
		}
		return jsonEvent;
	}
}
