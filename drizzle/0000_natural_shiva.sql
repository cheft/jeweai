CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text,
	`user_id` text,
	`name` text,
	`type` text,
	`source` text,
	`from_asset_id` text,
	`cover_path` text,
	`path` text,
	`size` integer,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`aspect_ratio` text,
	`duration` integer,
	`prompt` text,
	`metadata` text,
	`status` text DEFAULT 'unlocked',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`parent_id` text,
	`user_id` text,
	`path` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`asset_id` text,
	`prompt` text,
	`type` text,
	`style_id` text,
	`reference_asset_id` text,
	`result_asset_id` text,
	`status` text DEFAULT 'queued',
	`created_at` integer,
	`updated_at` integer,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`email` text,
	`nickname` text,
	`password` text,
	`salt` text,
	`status` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer
);
