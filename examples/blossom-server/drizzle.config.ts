import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	driver: 'better-sqlite'
} satisfies Config;
