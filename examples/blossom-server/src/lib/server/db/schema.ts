import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const files = sqliteTable('files', {
	hash: text('hash').primaryKey(),
	pubkey: text('pubkey').notNull(),
	name: text('name'),
	created: integer('created').notNull(),
	size: integer('size').notNull(),
	type: text('type')
});

export type DbFile = typeof files.$inferSelect;
