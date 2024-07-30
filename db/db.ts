import {Database} from 'sqlite3';
import config from "../config";
import {Item, Listing, TradeListing, ItemRow} from "../types/types";

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


export async function getItemsToMessage () : Promise<TradeListing[]> {
	const rows = await query<ItemRow[]>(`SELECT * FROM items 
         WHERE (messaged_at IS NULL OR messaged_at = 0) 
				 AND has_image = 1 
				 AND (dont_message IS NULL OR dont_message = 0)`, [])
	if (rows.length === 0) {
		return []
	}
	return rows.map(mapItemRowToListing)
}

export async function getItem (id: string) : Promise<null|TradeListing> {
	const row = await getItemRow(id)
	if (!row) {
		return null
	}
	return mapItemRowToListing(row)
}

function mapItemRowToListing (row: ItemRow) : TradeListing {
	const listing : TradeListing = {
		id: row.id,
		item: JSON.parse(row.item_json),
		listing: JSON.parse(row.listing_json),
		has_image: !!row.has_image,
		messaged_at: row.messaged_at ? new Date(row.messaged_at) : null,
	}
	listing.item.extended = listing.item.extended || null
	return listing
}

export async function insertTradeListing (data: TradeListing) {
	return insertItem(data.item, data.listing)
}
export async function insertItem (item: Item, listing?: Listing) {
	await query(`INSERT INTO items (id, name, date_added, item_json, listing_json, has_image)
VALUES (?, ?, ?, ?, ?, false)`, [
		item.id,
		item.name || 'unnamed',
		new Date().toISOString(),
		JSON.stringify(item),
		JSON.stringify(listing ? listing : null)
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
