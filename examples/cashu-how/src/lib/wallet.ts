import { PUBLIC_MINT_ID, PUBLIC_MINT_URL } from '$env/static/public';
import { createWalletStore } from '@cashu-wallet/svelte';

export const wallet = createWalletStore(PUBLIC_MINT_ID, PUBLIC_MINT_URL);
