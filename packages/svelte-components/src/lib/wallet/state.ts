import { createWalletStore, type WalletStore } from '@cashu-wallet/svelte';
import { getContext, onMount } from 'svelte';
import { writable } from 'svelte/store';

type Page = 'home' | 'send' | 'receive' | 'mints' | 'history' | 'scan';

export const createAppState = (id: string, mintUrl: string) => {
	const wallet = createWalletStore(id, mintUrl, {});
	return createAppStateWithWallet(wallet);
};

export const createAppStateWithWallet = (wallet: WalletStore) => {
	const page = writable<Page>('home');
	const mode = writable<'lightning' | 'ecash'>('ecash');

	onMount(async () => {
		await wallet.init();
	});

	return {
		wallet,
		page,
		mode
	};
};

type AppState = ReturnType<typeof createAppState>;

export const getAppState = () => getContext<AppState>('appState');
