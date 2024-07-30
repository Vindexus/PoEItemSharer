import {run, wait} from "../lib/helpers";
import {getListings} from "./trade-api";
import config from "../config";
import {TradeQuery} from "../types/types";
import {getItemRow, insertTradeListing} from '../db/db'

async function findAndInsertNew () {
	console.log('Try to find some new listings')

	const tq: TradeQuery = {
		"query": {
			"status": {
				"option": "any"
			},
			"stats": [
				{
					"type": "and",
					"filters": [],
					"disabled": false
				}
			]
		},
		"sort": {
			"indexed": "desc"
		}
	};

	let {items, nextPage} = await getListings(config.LEAGUE, tq)

	let foundExisting = false
	let numAdded = 0
	do {
		for (let [idx, listing] of items.entries()) {
			console.log('Check out this trade listing', listing.id, listing.item.name)
			const row = await getItemRow(listing.item.id)
			if (row) {
				foundExisting = true
				console.log('We already have this in the db')
			}
			else {
				await insertTradeListing(listing)
				numAdded++
			}
		}

		if (items.length >= 10 && !foundExisting) {
			console.log('Looks like there might be more, so we wait 10s cause of rate limiting')
			await wait(10000)
			items = await nextPage()
		}
	}
	while (items.length && !foundExisting)

	console.log('All done. Added: ' + numAdded)
}

run(async () => {
	while (true) {
		await findAndInsertNew()
		console.log('Wait ' + config.FETCH_ITEMS_DELAY_MS + 'ms...')
		await wait(config.FETCH_ITEMS_DELAY_MS)
	}
})
