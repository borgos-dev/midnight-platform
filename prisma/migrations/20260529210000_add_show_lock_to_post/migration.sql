-- Adds the per-post lock-overlay toggle for VIP+ blurred posts. Existing
-- rows default to TRUE so current behavior (blur + WhatsApp lock) is
-- preserved. Creators can flip this off per-post to render the blur
-- without the WhatsApp CTA — useful when they prefer routing curiosity
-- to the full profile page rather than direct WhatsApp.
ALTER TABLE `post` ADD COLUMN `showLock` BOOLEAN NOT NULL DEFAULT true;
