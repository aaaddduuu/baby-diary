CREATE TABLE IF NOT EXISTS moment_share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baby_id INTEGER NOT NULL REFERENCES babies(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  share_month TEXT NOT NULL,
  expires_on TEXT NOT NULL,
  revoked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moment_share_links_baby
  ON moment_share_links(baby_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moment_share_links_token
  ON moment_share_links(token_hash);
