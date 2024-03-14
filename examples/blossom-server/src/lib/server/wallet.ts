import * as fs from 'fs/promises';
import { SingleMintWallet, type AsyncStorageProvider, type WalletState } from '@cashu-wallet/core';

class FileStorageProvider implements AsyncStorageProvider<WalletState> {
	constructor(private readonly key: string) {}
	async get() {
		try {
			await fs.stat(this.key);
		} catch (e) {
			return null;
		}
		const value = await fs.readFile(this.key, 'utf8');
		if (!value) {
			return null;
		}
		return JSON.parse(value) as WalletState;
	}
	async set(value: WalletState) {
		return fs.writeFile(this.key, JSON.stringify(value));
	}
}
let serverWallet: SingleMintWallet | null = null;
async function getOrCreateServerWallet() {
	if (serverWallet) {
		return serverWallet;
	}
	serverWallet = await SingleMintWallet.loadFromAsyncStorage(
		`server-localhost-wallet`,
		'http://localhost:3338',
		new FileStorageProvider(`server-localhost-wallet.txt`)
	);
	console.log('Server wallet balance: ', serverWallet.state.balance);
	return serverWallet;
}

export { getOrCreateServerWallet };
