CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES families(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'member',
  nickname TEXT,
  avatar_emoji TEXT DEFAULT '🧑',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS babies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  family_id INTEGER REFERENCES families(id),
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
  feeding_type TEXT DEFAULT 'mixed',
  hospital TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baby_id INTEGER NOT NULL REFERENCES babies(id),
  member_id INTEGER REFERENCES family_members(id),
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_records_baby_id ON records(baby_id);
CREATE INDEX IF NOT EXISTS idx_records_recorded_at ON records(recorded_at);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baby_id INTEGER NOT NULL REFERENCES babies(id),
  member_id INTEGER REFERENCES family_members(id),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  name TEXT NOT NULL,
  channel TEXT,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_baby_id ON expenses(baby_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

CREATE TABLE IF NOT EXISTS growth_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baby_id INTEGER NOT NULL REFERENCES babies(id),
  weight REAL,
  height REAL,
  head_circumference REAL,
  photo_url TEXT,
  measured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_growth_baby_id ON growth_records(baby_id);

CREATE TABLE IF NOT EXISTS vaccines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baby_id INTEGER NOT NULL REFERENCES babies(id),
  name TEXT NOT NULL,
  status TEXT CHECK(status IN ('planned', 'completed')) DEFAULT 'planned',
  date TEXT,
  hospital TEXT,
  is_custom INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vaccines_baby_id ON vaccines(baby_id);
