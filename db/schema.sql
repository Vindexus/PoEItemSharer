DROP TABLE IF EXISTS items;
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT,
    item_json TEXT,
    listing_json TEXT,
    date_added TEXT,
    has_image INTEGER,
    messaged_at TEXT
);
