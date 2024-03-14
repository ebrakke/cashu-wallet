import type { BlobDescriptor } from 'blossom-client';
import crypto from 'crypto';
import * as fs from 'fs/promises';
import { readFileSync } from 'fs';

type BlobFile = {
	hash: string;
	owner: string;
	size: number;
	name?: string;
	created: number;
	type?: string;
};

class FileService {
	#fileMap = new Map<string, BlobFile>();
	constructor() {
		this.#loadSync();
	}

	async getByHash(hash: string) {
		return this.#fileMap.get(hash);
	}

	async loadFile(f: BlobFile): Promise<Buffer> {
		return fs.readFile(`files/${f.hash}`);
	}

	async getByFile(file: Blob): Promise<BlobFile | undefined> {
		const buffer = await file.arrayBuffer();
		const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
		return this.getByHash(hash);
	}

	async listByPubkey(pubkey: string): Promise<BlobDescriptor[]> {
		const files: BlobFile[] = [];
		for (const file of this.#fileMap.values()) {
			if (file.owner === pubkey) {
				files.push(file);
			}
		}
		return files.map((f) => this.toBlobDescriptor(f));
	}

	async saveFile(owner: string, file: Blob, name?: string): Promise<BlobFile> {
		const created = Math.floor(Date.now() / 1000);
		const buffer = await file.arrayBuffer();
		const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
		await fs.writeFile(`files/${hash}`, Buffer.from(buffer));
		const blobFile = {
			hash,
			owner,
			size: file.size,
			created,
			type: file.type,
			name
		} satisfies BlobFile;
		this.#fileMap.set(hash, blobFile);
		await this.#persist();
		return blobFile;
	}

	toBlobDescriptor(file: BlobFile): BlobDescriptor {
		return {
			url: `http://localhost:5173/${file.hash}`,
			sha256: file.hash,
			size: file.size,
			created: file.created
		};
	}

	async #persist() {
		const data = JSON.stringify(Array.from(this.#fileMap.entries()));
		await fs.writeFile('fileMap.json', data);
	}

	#loadSync() {
		try {
			const data = readFileSync('fileMap.json', 'utf8');
			const entries = JSON.parse(data);
			this.#fileMap = new Map(entries);
		} catch (e) {
			console.error('failed to load fileMap.json', e);
		}
	}
}

const fileService = new FileService();
export { fileService };
