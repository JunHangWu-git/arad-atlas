ALTER TABLE `characters` ADD `position` integer;--> statement-breakpoint
UPDATE `characters` SET `position` = (
  SELECT COUNT(*) FROM `characters` AS c2
  WHERE c2.created_at > `characters`.created_at
     OR (c2.created_at = `characters`.created_at AND c2.id < `characters`.id)
);