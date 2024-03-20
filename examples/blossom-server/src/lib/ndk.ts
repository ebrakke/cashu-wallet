import NDK from '@nostr-dev-kit/ndk';
import { writable } from 'svelte/store';

const ndk = writable(new NDK());

export default ndk;
