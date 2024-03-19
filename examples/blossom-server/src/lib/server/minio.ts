import { Client } from 'minio';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

export interface BlobRepository {
	save: (pubkey: string, hash: string, file: Blob) => Promise<void>;
	get: (pubkey: string, hash: string) => Promise<Blob>;
}

export class MinioBlobRepository implements BlobRepository {
	client: Client;
	constructor() {
		this.client = new Client({
			endPoint: 'localhost',
			port: 9000,
			useSSL: false,
			accessKey: 'hRYBWiYRzMXJNEA8NbjM',
			secretKey: 'CTJFnt0VWVvlKcyA2c6jMKR1AJ8gRdoqFMn3sycK'
		});
	}

	async save(pubkey: string, hash: string, file: Blob) {
		const bucketName = this.pubkeyToBucketName(pubkey);
		const exists = await this.client.bucketExists(bucketName);
		if (!exists) {
			await this.client.makeBucket(bucketName, 'us-east-1');
		}
		const buffer = await file.arrayBuffer();
		await this.client.putObject(bucketName, hash, Buffer.from(buffer), file.size, {
			'content-type': file.type
		});
	}

	async get(pubkey: string, hash: string): Promise<Blob> {
		const bucketName = this.pubkeyToBucketName(pubkey);
		const exists = await this.client.bucketExists(bucketName);
		if (!exists) {
			throw new Error('bucket does not exist');
		}
		const chunks: Uint8Array[] = [];
		const stream = await this.client.getObject(bucketName, hash);
		await pipeline(stream, async function* (source) {
			for await (const chunk of source) {
				chunks.push(chunk);
			}
		});
		return new Blob(chunks);
	}

	pubkeyToBucketName(pubkey: string) {
		return crypto.createHash('sha1').update(pubkey).digest('hex');
	}
}
