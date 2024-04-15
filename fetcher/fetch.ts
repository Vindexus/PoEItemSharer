import {run, wait} from "../lib/helpers";
import {getListings} from "./trade-api";
import config from "../config";
import {TradeQuery} from "../types/types";
import {getTradeListingRow, insertTradeListing, query} from '../db/db'

async function findAndInsertNew () {
	console.log('Try to find some new listings')
	/*const tradeQuery : TradeQuery = {
		"query":{
			"status":{
				"option":"any"
			},
			"stats":[{"type":"and","filters":[]}]
		},
		"sort":{"indexed":"desc"}
	}*/

	const tq : TradeQuery = {"query":{"status":{"option":"any"},"stats":[{"type":"and","filters":[],"disabled":false}]},"sort":{"indexed":"desc"}}

	const maxResult = await query<{max: string}[]>(`SELECT MAX(date_added) as max FROM items`)
	console.log('maxResult', maxResult)
	const maxDate = (maxResult.length && maxResult[0]!.max) ? new Date(maxResult[0]!.max) : new Date(0);

	console.log('maxDate', maxDate)

	let {items, nextPage} = await getListings(config.LEAGUE, tq)

	let foundExisting = false
	let numAdded = 0
	do {
		for (let [idx, listing] of items.entries()) {
			console.log('Check out this trade listing', listing.id, listing.item.name)
			const row = await getTradeListingRow(listing.id)
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
		console.log('Wait 30s...')
		await wait(30000)
	}
})
