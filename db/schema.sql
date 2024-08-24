DROP TABLE IF EXISTS items;
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    discord_message_id TEXT,
    message_edited_at TEXT,
    stash_tab_name TEXT,
    stash_tab_pos TEXT,
    name TEXT,
    item_json TEXT,
    listing_json TEXT,
    date_added TEXT,
    has_image INTEGER,
    messaged_at TEXT,
    dont_message INTEGER
);
