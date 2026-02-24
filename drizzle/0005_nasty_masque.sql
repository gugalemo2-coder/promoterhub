CREATE TABLE `app_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`login` varchar(128) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`appRole` enum('promoter','manager','master') NOT NULL DEFAULT 'promoter',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_users_login_unique` UNIQUE(`login`)
);
