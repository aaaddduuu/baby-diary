ALTER TABLE daily_moment_photos
ADD COLUMN media_kind TEXT NOT NULL DEFAULT 'image'
CHECK(media_kind IN ('image', 'video', 'live_photo'));

ALTER TABLE daily_moment_photos
ADD COLUMN motion_r2_key TEXT;

ALTER TABLE daily_moment_photos
ADD COLUMN motion_content_type TEXT;

ALTER TABLE daily_moment_photos
ADD COLUMN motion_size_bytes INTEGER;

UPDATE daily_moment_photos
SET media_kind = 'video'
WHERE content_type LIKE 'video/%';
