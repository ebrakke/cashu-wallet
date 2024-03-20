CREATE TABLE `files` (
	`hash` text PRIMARY KEY NOT NULL,
	`pubkey` text NOT NULL,
	`name` text,
	`created` integer NOT NULL,
	`size` integer NOT NULL
);
