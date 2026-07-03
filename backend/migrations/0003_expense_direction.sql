ALTER TABLE expenses
ADD COLUMN direction TEXT NOT NULL DEFAULT 'expense'
CHECK(direction IN ('expense', 'income'));
