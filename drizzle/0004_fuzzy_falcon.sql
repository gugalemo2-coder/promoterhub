CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`geoRadiusKm` decimal(5,2) NOT NULL DEFAULT '0.50',
	`weightPhotos` int NOT NULL DEFAULT 30,
	`weightHours` int NOT NULL DEFAULT 25,
	`weightVisits` int NOT NULL DEFAULT 25,
	`weightMaterials` int NOT NULL DEFAULT 10,
	`weightQuality` int NOT NULL DEFAULT 10,
	`notifyGeoAlert` boolean NOT NULL DEFAULT true,
	`notifyLowHours` boolean NOT NULL DEFAULT true,
	`notifyMaterialRequest` boolean NOT NULL DEFAULT true,
	`notifyPhotoRejected` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_managerId_unique` UNIQUE(`managerId`)
);
