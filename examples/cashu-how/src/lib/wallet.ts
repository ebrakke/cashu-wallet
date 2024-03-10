import { createWalletStore } from '@cashu-wallet/svelte';

export const wallet = createWalletStore('local', 'http://localhost:3338');
