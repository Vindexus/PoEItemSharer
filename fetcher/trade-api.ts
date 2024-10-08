import axios from 'axios'
import config from '../config'
import {GuildStashTab, Item, ItemInfo, TradeQuery} from "../types/types";

const api = axios.create({
	baseURL: 'https://www.pathofexile.com/',
	headers: {
		cookie: 'POESESSID=' + config.POESESSID,
		"User-Agent": config.USER_AGENT,
	},
})

api.interceptors.response.use(function (response) {
	// Any status code that lie within the range of 2xx cause this function to trigger
	// Do something with response data
	return response;
}, function (error) {
	console.log('errror!', error.toString())
	console.log('error.response?', error.response)
	if (error?.response?.data?.error?.message === 'Invalid query') {
		throw new Error(`Received "Invalid query" from API. That could mean POESESSID is expired if you are fetching from a private league`)
	}
	// Any status codes that falls outside the range of 2xx cause this function to trigger
	// Do something with response error
	return Promise.reject(error);
});

type SearchResult = {
	id: string,
	result: string[]
}

export async function search (league: string, query: any) : Promise<SearchResult> {
	const res = await api.post<{id: string, result: string[]}>('/search/' + league, query)
	return {
		id: res.data.id,
		result: res.data.result
	}
}

type FetchResult = {
	items: ItemInfo[],
	nextPage: () => Promise<ItemInfo[]>
}
export async function fetch (query: string, results: string[]) : Promise<FetchResult> {
	let perPage = 10
	let start = 0
	async function nextPage () : Promise<ItemInfo[]> {
		const items = results.slice(start, start + perPage - 1)
		if (items.length === 0) {
			return []
		}
		const res = await api.get('/api/trade/fetch/' + items.join(',') + '?query=' + query)
		start += perPage
		return res.data.result as ItemInfo[]
	}

	return {
		nextPage,
		items: await nextPage()
	}
}

export async function getListings (league: string, query: TradeQuery) : Promise<FetchResult> {
	const result = await search(league, query)
	const result2 = await fetch(result.id, result.result)
	return result2
}

export type GetGuildStashOpts = {
	accountName: string,
	realm: 'pc' | 'console',
	tabIndex: number
	league: string
}
export async function getGuildStashTabItems (opts: GetGuildStashOpts): Promise<Item[]> {
	const res = await getGuildStashTab(opts)
	return res.items
}

export async function getGuildStashTab (opts: GetGuildStashOpts): Promise<{
	items: Item[]
	tabs: GuildStashTab[]
}> {
	const url = `/character-window/get-guild-stash-items?accountName=${opts.accountName}&tabs=1&realm=${opts.realm}&tabIndex=${opts.tabIndex}&league=${opts.league}`
	console.log('url', url)
	const res = await api.get(url)
	return res.data
}
