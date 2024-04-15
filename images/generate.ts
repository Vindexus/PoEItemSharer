import config from "../config";
import db, {query} from '../db/db'
import {run, wait} from "../lib/helpers";
import puppeteer from 'puppeteer'
import path from 'path'

const itemsImagePath = path.join(__dirname, '..', 'express', 'public', 'images', 'items')


run(async () => {
	async function generateImage (id: string) {
		console.log(`Generating image for ${id}`)
		await page.goto(`http://localhost:${config.PORT}/item/${id}`, { waitUntil: 'networkidle0' });
		await page.waitForSelector(selector);


		const element = await page.$(selector);
		await element!.screenshot({
			path: path.join(itemsImagePath, id + '.png')
		})

		console.log(`View image at http://localhost:${config.PORT}/images/items/${id}.png`)
		console.log(`Updating the image in the db`)
		await query(`UPDATE items SET has_image = ? WHERE id = ?`, [true, id])
	}

	let browser = await puppeteer.launch();
	let page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
	const selector = '.listing'

	if (process.argv[2]) {
		await generateImage(process.argv[2])
		await browser.close()
		console.log('Done with one thing')
		process.exit(0)
		return
	}

	await browser.close()


	let sql = `SELECT id, has_image FROM items WHERE has_image IS NULL OR has_image = 0`
	const params : any[] = []


	while (true) {
		console.log('sql', sql, params)
		const items = await query<{id: string, has_image: number}[]>(sql, params)
		console.log(`Found ${items.length} items in need of images`)
		if (items.length) {
			browser = await puppeteer.launch();
			page = await browser.newPage();
			await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
			for (let i = 0; i < items.length; i++) {
				const item = items[i]!
				if (item.has_image && !process.argv[2]) {
					console.log('Has an image already, skip it')
					continue
				}
				await generateImage(item.id)
			}
			await browser.close()
		}
		console.log('Waiting 30s')
		await wait(30000)
	}


	process.exit(0)
})
