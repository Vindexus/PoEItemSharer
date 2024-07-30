import {generateImage, getItemsWithoutImages, run, wait} from "../lib/helpers";
import puppeteer from 'puppeteer'

const viewPort = { width: 1280, height: 720, deviceScaleFactor: 2 }

run(async () => {
	let browser = await puppeteer.launch();
	let page = await browser.newPage();
	await page.setViewport(viewPort);
	const selector = '.listing'

	if (process.argv[2]) {
		await generateImage(process.argv[2], browser)
		await browser.close()
		console.log('Done with one thing')
		process.exit(0)
		return
	}

	await browser.close()


	while (true) {
		const items = await getItemsWithoutImages()
		console.log(`Found ${items.length} items in need of images`)
		if (items.length) {
			browser = await puppeteer.launch();
			page = await browser.newPage();
			await page.setViewport(viewPort);
			for (let i = 0; i < items.length; i++) {
				const item = items[i]!
				if (item.has_image && !process.argv[2]) {
					console.log('Has an image already, skip it')
					continue
				}
				await generateImage(item.id, page)
			}
			await browser.close()
		}
		console.log('Waiting 5s')
		await wait(5000)
	}


	process.exit(0)
})
