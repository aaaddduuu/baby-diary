ALTER TABLE babies ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);
