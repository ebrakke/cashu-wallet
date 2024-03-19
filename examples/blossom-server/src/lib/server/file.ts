import type { BlobDescriptor } from 'blossom-client';
import crypto from 'crypto';
import { MinioBlobRepository, type BlobRepository } from './minio';
import { db, type Database } from './db/client';
import { files, type DbFile } from './db/schema';

class FileService {
	constructor(
		private readonly storage: BlobRepository,
		private readonly db: Database
	) {}

	async loadFile(hash: string): Promise<Blob> {
		const file = await this.db.query.files.findFirst({
			where: (f, { eq }) => eq(f.hash, hash)
		});
		if (!file) {
			throw new Error('file not found');
		}
		const blob = await this.storage.get(file.pubkey, hash);
		if (!blob) {
			throw new Error('file not found');
		}
		return blob;
	}

	async listByPubkey(pubkey: string): Promise<BlobDescriptor[]> {
		const files = await this.db.query.files.findMany({
			where: (f, { eq }) => eq(f.pubkey, pubkey)
		});
		return files.map(this.#fileToBlobDescriptor);
	}

	async saveFile(owner: string, file: Blob, name?: string): Promise<BlobDescriptor> {
		const created = Math.floor(Date.now() / 1000);
		const buffer = await file.arrayBuffer();
		const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
		await this.db
			.insert(files)
			.values({ hash, pubkey: owner, name, created, size: file.size, type: file.type });
		await this.storage.save(owner, hash, file);
		return {
			created,
			sha256: hash,
			size: file.size,
			type: file.type,
			url: `http://localhost:5173/${hash}`
		};
	}

	#fileToBlobDescriptor(file: DbFile): BlobDescriptor {
		return {
			created: file.created,
			sha256: file.hash,
			size: file.size,
			type: file.type ?? undefined,
			url: `http://localhost:5173/${file.hash}`
		};
	}
}

const fileService = new FileService(new MinioBlobRepository(), db);
export { fileService };
