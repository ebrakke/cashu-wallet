import { getOrCreateServerWallet } from '$lib/server/wallet';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import * as fs from 'fs';

const ipsFilesExists = fs.existsSync('ips.txt');
if (!ipsFilesExists) {
	fs.writeFileSync('ips.txt', '');
}
const savedIps = fs.readFileSync('ips.txt', 'utf8');

const ipsRequestedMap = new Set([...savedIps.split('\n')]);

export const GET: RequestHandler = async (request) => {
	const ip = request.getClientAddress();
	console.log(ip);
	if (ipsRequestedMap.has(ip)) {
		throw error(429, 'You have already requested tokens');
	}
	const params = new URLSearchParams(request.url.search);
	if (!params.get('amount') || isNaN(parseInt(params.get('amount')!))) {
		return error(400, 'Invalid amount');
	}
	const wallet = await getOrCreateServerWallet();
	const amount = parseInt(params.get('amount')!);
	try {
		const token = await wallet.sendEcash(amount);
		ipsRequestedMap.add(ip);
		fs.appendFileSync('ips.txt', ip + '\n');
		return json({ token });
	} catch (e) {
		return error(500, 'Unable to send tokens');
	}
};
