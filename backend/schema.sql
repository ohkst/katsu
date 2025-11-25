DROP TABLE IF EXISTS winners;
CREATE TABLE winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  winner_address TEXT,
  winning_number INTEGER,
  prize_amount TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
