import path from 'path'
import {query} from '../db/db'
import config from "../config";
import {Page} from 'puppeteer';
import {ItemInfo} from "../types/types";

const ITEMS_IMAGE_DIR = path.join(__dirname, '..', 'express', 'public', 'images', 'items')


export function run (fn: Function) {
	try {
		fn()
	}
	catch (ex) {
		console.log('ex', ex)
		process.exit(1)
	}
}

export function getTradeListingImagePath (listing: ItemInfo) : string {
	return getTradeListingImagePathFromId(listing.id)
}

export function getTradeListingImagePathFromId (id: string) : string {
	return path.join(ITEMS_IMAGE_DIR, id + '.png')
}

export async function wait (time: number) {
	return new Promise<void>((res) => {
		setTimeout(() => {
			res()
		}, time)
	})
}

export async function generateImage (id: string, page: Page) {
	console.log(`Generating image for ${id}`)
	await page.goto(`http://localhost:${config.PORT}/item/${id}`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('.listing');

	const element = await page.$('.listing');
	await element!.screenshot({
		path: path.join(ITEMS_IMAGE_DIR, id + '.png')
	})

	console.log(`View image at http://localhost:${config.PORT}/images/items/${id}.png`)
	console.log(`Updating the image in the db`)
	await query(`UPDATE items SET has_image = ? WHERE id = ?`, [true, id])
}

export async function getItemsWithoutImages () {
	let sql = `SELECT id, has_image FROM items WHERE has_image IS NULL OR has_image = 0`
	const params : any[] = []
	const items = await query<{id: string, has_image: number}[]>(sql, params)
	return items;
}

/**
 * Returns the most recent date of item that was added
 * If there are none in the database, we use 1970-01-01
 * @returns {Promise<Date>}
 */
export async function getMaxDateAdded () : Promise<Date> {
	const maxResult = await query<{max: string}[]>(`SELECT MAX(date_added) as max FROM items`)
	const maxDate = (maxResult.length && maxResult[0]!.max) ? new Date(maxResult[0]!.max) : new Date(0);
	return maxDate;
}
