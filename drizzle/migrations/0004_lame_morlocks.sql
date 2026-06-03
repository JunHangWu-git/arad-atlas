CREATE TABLE `progression_note` (
	`character_fk` text PRIMARY KEY NOT NULL,
	`priority` integer,
	`note` text,
	`updated_at` integer,
	FOREIGN KEY (`character_fk`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
