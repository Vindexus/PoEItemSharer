import {run, wait} from "../lib/helpers";
import config from "../config";
import {GetGuildStashOpts, getGuildStashTab, getGuildStashTabItems} from "./trade-api";
import {insertItemIfNotExists} from "../db/db";
const opts : GetGuildStashOpts = {
	accountName: config.FETCH_GUILD_ACCOUNT_NAME,
	realm: config.FETCH_GUILD_REALM,
	league: config.LEAGUE,
	tabIndex: 0,
}
console.log('opts' )

async function findAndInsertNew (tabIndex: number) : Promise<{
	numberInserted: number,
}> {
	console.log('Finding new items in guild stash tab', tabIndex, '...', 'accountName', config.FETCH_GUILD_ACCOUNT_NAME, 'realm', config.FETCH_GUILD_REALM, 'league', config.LEAGUE, 'tabIndex', tabIndex, '...')
	const items = await getGuildStashTabItems({
		...opts,
		tabIndex,
	})
	let numberInserted = 0
	let numSkipped = 0
	for (let item of items) {
		const result = await insertItemIfNotExists(item)

		console.log(result, item.id.substring(0, 10) + '...', JSON.stringify(item))
		if (result === 'inserted') {
			numberInserted++
		}
		else {
			numSkipped++
		}
	}

	console.log(`Skipped ${numSkipped} items`)

	return {
		numberInserted,
	}
}

const maxWaitTimeMS = 1000 * 60 * 30

run(async () => {
	const firstStash = await getGuildStashTab({
		...opts,
		tabIndex: 0,
	})
	const tabs = firstStash.tabs.map((t, i) => {
		console.log('t.i', t.i, i)
		return t
	}).filter((t) => {
		return config.FETCH_GUILD_STASH_TAB_NAMES.includes(t.n.toLowerCase())
	})
	console.log('Filtered tabs', tabs.map((t, i) => {
		return {
			n: t.n,
			index: i,
			type: t.type,
		}
	}))
	if (tabs.length === 0) {
		console.log('No tabs to look for')
		console.log('config.FETCH_GUILD_STASH_TAB_NAMES', config.FETCH_GUILD_STASH_TAB_NAMES)
		process.exit(1)
	}
	while (true) {
		let numWithoutInserts = 0
		for (let tab of tabs) {
			console.log('Loading stash ' + tab.n + '...')
			const result = await findAndInsertNew(tab.i)
			if (result.numberInserted > 0) {
				numWithoutInserts = 0
			}
			else {
				numWithoutInserts++
			}
			await wait(1000) // Time between each tab
		}

		let waitTime = config.FETCH_GUILD_STASH_DELAY_MS
		if (numWithoutInserts >= 1) {
			const before = waitTime
			waitTime += numWithoutInserts * config.FETCH_GUILD_STASH_DELAY_INCREMENT_MS
			console.log(`No new items, adjusting the waiting time by adding ${waitTime - before}ms to ${before}ms`)
			waitTime = Math.min(waitTime, config.FETCH_GUILD_STASH_DELAY_MAX_MS)
			if (waitTime === maxWaitTimeMS) {
				console.log('Max wait time reached')
			}
		}

		console.log('Wait ' + waitTime + 'ms...')
		await wait(waitTime)
	}
})
