CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`logoUrl` varchar(500),
	`colorHex` varchar(7),
	`iconName` varchar(100),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geo_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`timeEntryId` int,
	`alertType` enum('left_radius','suspicious_movement','gps_spoofing_suspected','low_hours','no_entry') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`distanceFromStore` decimal(7,2),
	`alertTimestamp` timestamp NOT NULL DEFAULT (now()),
	`acknowledged` boolean NOT NULL DEFAULT false,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geo_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`materialId` int NOT NULL,
	`storeId` int NOT NULL,
	`quantityRequested` int NOT NULL,
	`status` enum('pending','approved','rejected','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`notes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	`deliveredAt` timestamp,
	`deliveredBy` int,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`photoUrl` varchar(500),
	`quantityAvailable` int NOT NULL DEFAULT 0,
	`quantityReserved` int NOT NULL DEFAULT 0,
	`quantityDelivered` int NOT NULL DEFAULT 0,
	`unit` enum('unit','box','pack','kg','liter') NOT NULL DEFAULT 'unit',
	`status` enum('active','inactive','discontinued') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandId` int NOT NULL,
	`storeId` int NOT NULL,
	`photoUrl` varchar(500) NOT NULL,
	`thumbnailUrl` varchar(500),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`photoTimestamp` timestamp NOT NULL,
	`fileSize` int,
	`fileType` varchar(50),
	`description` text,
	`qualityRating` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`managerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoter_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(20),
	`cpf` varchar(11),
	`appRole` enum('promoter','manager') NOT NULL DEFAULT 'promoter',
	`storeId` int,
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoter_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50),
	`fileSize` int,
	`description` text,
	`uploadedBy` int NOT NULL,
	`visibility` enum('all_promoters','specific_stores','specific_users') NOT NULL DEFAULT 'all_promoters',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`phone` varchar(20),
	`managerId` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`entryType` enum('entry','exit') NOT NULL,
	`entryTime` timestamp NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` decimal(5,2),
	`distanceFromStore` decimal(7,2),
	`isWithinRadius` boolean NOT NULL DEFAULT true,
	`deviceId` varchar(255),
	`ipAddress` varchar(45),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `time_entries_id` PRIMARY KEY(`id`)
);
