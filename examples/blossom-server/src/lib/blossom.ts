import ndk from './ndk';
import { getEventHash, type EventTemplate, type VerifiedEvent, verifiedSymbol } from 'nostr-tools';
import { get } from 'svelte/store';

export const signer = async (e: EventTemplate) => {
	const $ndk = get(ndk);
	if (!$ndk.signer) {
		throw new Error('No signer available');
	}
	if (!$ndk.activeUser) {
		throw new Error('No active user');
	}

	const event = e as VerifiedEvent;
	event.pubkey = $ndk.activeUser.pubkey;
	event.id = getEventHash(event);
	event.sig = await $ndk.signer.sign(event);
	event[verifiedSymbol] = true;
	return event;
};
