import {generateImage, getItemsWithoutImages, run, wait} from "../lib/helpers";
import puppeteer from 'puppeteer'

const viewPort = { width: 1280, height: 720, deviceScaleFactor: 2 }
const puppeteerLaunchArgs = {
	headless: true,
	args: ['--no-sandbox']
}
run(async () => {
	let browser = await puppeteer.launch(puppeteerLaunchArgs);
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
			try {
				browser = await puppeteer.launch(puppeteerLaunchArgs);
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
			catch (ex) {
				console.error('Error generating image', ex)
				console.log('Closing puppeteer and waiting 8s')
				await browser.close()
				await wait(8000)
			}
		}
		console.log('Waiting 5s')
		await wait(5000)
	}


	process.exit(0)
})

process.on('SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
	// some other closing procedures go here
	process.exit(0);
});
