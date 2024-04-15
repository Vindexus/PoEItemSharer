import {Database} from 'sqlite3';
import config from "../config";
import {TradeListing, TradeListingRow} from "../types/types";

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

export async function getTradeListingRow (id: string) : Promise<null|TradeListingRow> {
	const rows = await query<TradeListingRow[]>(`SELECT * FROM items WHERE id = ?`, [id])
	if (rows.length === 0) {
		return null
	}
	return rows[0]!
}


export async function getUnsentTradeListings () : Promise<TradeListing[]> {
	const rows = await query<TradeListingRow[]>(`SELECT * FROM items WHERE (messaged_at IS NULL OR messaged_at = 0) AND has_image = 1`, [])
	if (rows.length === 0) {
		return []
	}
	return rows.map(mapRow)
}

export async function getTradeListing (id: string) : Promise<null|TradeListing> {
	const row = await getTradeListingRow(id)
	if (!row) {
		return null
	}
	return mapRow(row)
}

function mapRow (row: TradeListingRow) : TradeListing {
	return {
		id: row.id,
		item: JSON.parse(row.item_json),
		listing: JSON.parse(row.listing_json),
		has_image: !!row.has_image,
		messaged_at: row.messaged_at ? new Date(row.messaged_at) : null,
	}
}

export async function insertTradeListing (data: TradeListing) {
	await query(`INSERT INTO items (id, name, date_added, item_json, listing_json, has_image)
VALUES (?, ?, ?, ?, ?, false)`, [
		data.id,
		data.item.name || 'unnamed',
		new Date().toISOString(),
		JSON.stringify(data.item),
		JSON.stringify(data.listing)
	])
}
