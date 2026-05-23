ALTER TABLE records ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
