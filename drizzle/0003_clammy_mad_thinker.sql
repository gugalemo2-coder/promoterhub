CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` enum('geo_alert','material_request','material_approved','material_rejected','new_file','photo_approved','photo_rejected','system') NOT NULL,
	`relatedId` int,
	`relatedType` varchar(50),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signed_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` varchar(64) NOT NULL,
	`managerId` int NOT NULL,
	`promoterId` int,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`signatureData` text NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`reportHash` varchar(128) NOT NULL,
	`pdfUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signed_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `signed_reports_reportId_unique` UNIQUE(`reportId`)
);
