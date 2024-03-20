export type AuthEvent = {
	id: string;
	pubkey: string;
	kind: 24242;
	content: string;
	created_at: number;
	tags: [
		['t', 'upload' | 'get' | 'delete'],
		['size', string],
		['expiration', string],
		['name', string]
	];
	sig: string;
};
