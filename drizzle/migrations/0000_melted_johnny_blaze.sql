CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`character_id` text NOT NULL,
	`character_name` text NOT NULL,
	`adventure_name` text,
	`job_id` text,
	`job_grow_id` text,
	`job_name` text,
	`level` integer,
	`guild_name` text,
	`guide_urls` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `characters_server_char_uniq` ON `characters` (`server_id`,`character_id`);--> statement-breakpoint
CREATE TABLE `fame_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_fk` text,
	`fame` integer,
	`level` integer,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`character_fk`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fame_snapshot_char_captured_idx` ON `fame_snapshot` (`character_fk`,`captured_at`);--> statement-breakpoint
CREATE TABLE `gear_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_fk` text,
	`equipment` text,
	`avatar` text,
	`creature` text,
	`flag` text,
	`mist_assimilation` text,
	`talisman` text,
	`buff_equipment` text,
	`buff_avatar` text,
	`buff_creature` text,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`character_fk`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gear_snapshot_char_captured_idx` ON `gear_snapshot` (`character_fk`,`captured_at`);--> statement-breakpoint
CREATE TABLE `guide_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_fk` text,
	`source` text,
	`url` text NOT NULL,
	`title` text,
	`summary` text,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`character_fk`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guide_cache_char_source_idx` ON `guide_cache` (`character_fk`,`source`);--> statement-breakpoint
CREATE TABLE `item_cache` (
	`item_id` text PRIMARY KEY NOT NULL,
	`payload` text,
	`fetched_at` integer
);
--> statement-breakpoint
CREATE TABLE `job_cache` (
	`job_id` text PRIMARY KEY NOT NULL,
	`payload` text,
	`fetched_at` integer
);
--> statement-breakpoint
CREATE TABLE `skill_cache` (
	`job_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`payload` text,
	`fetched_at` integer,
	PRIMARY KEY(`job_id`, `skill_id`)
);
--> statement-breakpoint
CREATE TABLE `snapshot_lock` (
	`character_fk` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `status_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_fk` text,
	`status` text,
	`buff` text,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`character_fk`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `status_snapshot_char_captured_idx` ON `status_snapshot` (`character_fk`,`captured_at`);