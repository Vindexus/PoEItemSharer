import {Database} from 'sqlite3';
import config from "../config";
import {Item, Listing, ItemInfo, ItemRow} from "../types/types";

const db = new Database(config.DATABASE_FILE)
export default db

export async function query<T>(sql: string, params: any[] = []) : Promise<T> {
	return new Promise((resolve, rej) => {
		db.all(sql, params, (err, result) => {
			if (err) {
				rej(err)
				return
			}

			resolve(result as unknown as T)
		})
	})
}

export async function getItemRow (id: string) : Promise<null|ItemRow> {
	const rows = await query<ItemRow[]>(`SELECT * FROM items WHERE id = ?`, [id])
	if (rows.length === 0) {
		return null
	}
	return rows[0]!
}


export async function getItemsToMessage () : Promise<ItemInfo[]> {
	const rows = await query<ItemRow[]>(`SELECT * FROM items 
         WHERE (messaged_at IS NULL OR messaged_at = 0) 
				 AND has_image = 1 
				 AND (dont_message IS NULL OR dont_message = 0)`, [])
	if (rows.length === 0) {
		return []
	}
	return rows.map(mapItemRowToItemInfo)
}

export async function getItem (id: string) : Promise<null|ItemInfo> {
	const row = await getItemRow(id)
	if (!row) {
		return null
	}
	return mapItemRowToItemInfo(row)
}

function mapItemRowToItemInfo (row: ItemRow) : ItemInfo {
	const listing : ItemInfo = {
		id: row.id,
		item: JSON.parse(row.item_json),
		listing: JSON.parse(row.listing_json),
		has_image: !!row.has_image,
		messaged_at: row.messaged_at ? new Date(row.messaged_at) : null,
		stash_tab_name: row.stash_tab_name,
		stash_tab_pos: row.stash_tab_pos,
		dont_message: !!row.dont_message,
		name: row.name,
	}
	listing.item.extended = listing.item.extended || null
	return listing
}

export async function insertTradeListing (data: ItemInfo) {
	return insertItem(data.item, {
		listing: data.listing
	})
}

type InsertExtra = {
	stash_tab_name?: string
	stash_tab_pos?: string
	listing?: Listing
}
export async function insertItem (item: Item, extra: InsertExtra = {}) {
	await query(`INSERT INTO items (id, name, date_added, item_json, listing_json, has_image, stash_tab_name, stash_tab_pos)
VALUES (?, ?, ?, ?, ?, false, ?, ?)`, [
		item.id,
		item.name || 'unnamed',
		new Date().toISOString(),
		JSON.stringify(item),
		JSON.stringify(extra.listing ? extra.listing : null),
		extra.stash_tab_name || null,
		extra.stash_tab_pos || null,
	])
}

export async function insertItemIfNotExists (item: Item) : Promise<'skipped'|'inserted'> {
	const row = await getItemRow(item.id)
	if (row) {
		return 'skipped'
	}
	await insertItem(item)
	return 'inserted'
}

export async function upsertGuildStashItem (item: Item, stashName: string, position: string) {
	const row = await getItemRow(item.id)
	if (row) {
		if (row.stash_tab_name === stashName && row.stash_tab_pos === position) {
			return 'skipped'
		}
		await query(`UPDATE items SET stash_tab_name = ?, stash_tab_pos = ? WHERE id = ?`, [
			stashName,
			position,
			item.id,
		])
		return 'updated'
	}
	else {
		await insertItem(item, {
			stash_tab_name: stashName,
			stash_tab_pos: position,
		})
		return 'inserted'
	}
}
