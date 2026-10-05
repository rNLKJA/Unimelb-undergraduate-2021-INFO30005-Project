CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_unique` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` text NOT NULL,
	`content` text NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `blogs_created_idx` ON `blogs` (`created_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`password` text NOT NULL,
	`portfolio_img` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customer_id_unique` ON `customers` (`customer_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`food` text NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`food`) REFERENCES `products`(`product`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`van_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`price` real NOT NULL,
	`status` text NOT NULL,
	`order_date` text NOT NULL,
	`start_time` integer NOT NULL,
	`collection_time` integer,
	`discount_time` integer NOT NULL,
	`fulfilled_time` integer,
	`end_time` integer,
	`period` text,
	`comment` text,
	`rating` integer,
	`discount_applied` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`van_id`) REFERENCES `vans`(`van_id`) ON UPDATE cascade ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_id_unique` ON `orders` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_van_status_idx` ON `orders` (`van_id`,`status`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_start_idx` ON `orders` (`start_time`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product` text NOT NULL,
	`price` real NOT NULL,
	`photo` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_product_unique` ON `products` (`product`);--> statement-breakpoint
CREATE TABLE `vans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`van_id` text NOT NULL,
	`password` text NOT NULL,
	`x_coord` real NOT NULL,
	`y_coord` real NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '0' NOT NULL,
	`location_updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vans_van_id_unique` ON `vans` (`van_id`);--> statement-breakpoint
CREATE INDEX `vans_status_idx` ON `vans` (`status`);