CREATE TABLE `product_expiration_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expirationId` int NOT NULL,
	`photoUrl` varchar(500) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_expiration_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_expirations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandId` int NOT NULL,
	`storeId` int NOT NULL,
	`description` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`managerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_expirations_id` PRIMARY KEY(`id`)
);
