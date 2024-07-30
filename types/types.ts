export type Item = {
	id: string
	name: string
	icon: string
	ilvl?: number
	rarity?: string
	baseType?: string
	typeLine?: string
	explicitMods?: string[]
	enchantMods?: string[]
	implicitMods?: string[]
	craftedMods?: string[]
	fracturedMods?: string[]
	properties?: Property[]
	requirements?: Property[]
	extended?: Extended
	sockets?: Socket[]
	influences?: Record<string, boolean>
	identified?: boolean
	corrupted?: boolean
	veiled?: boolean
	synthesised?: boolean
	searing?: boolean
	tangled?: boolean
	veiledMods?: string[]

}

type Socket = {
	sColour: string
	group: number,
}

export type Extended = {
	dps?: number
	dps_aug: boolean
	pdps?: number
	pdp_aug: boolean
	edps?: number
	edp_aug: boolean

	base_defence_percentile?: number

	ar?: number
	ar_aug: boolean

	es?: number
	es_aug: boolean

	ev?: number
	ev_aug: boolean
}

export type Property = {
	name: string
	displayMode: number
	type: number
	values: PropertyValue
}

export type PropertyValue = number[][]

export type Listing = {
	account: {
		name: string
	},
	indexed: string
}

// Row from db after massaging data
export type TradeListing = {
	id: string
	listing: Listing | null
	item: Item
	has_image: boolean
	messaged_at : null | Date
}

export type TradeQuery = any

// Row from db, raw
export type ItemRow = {
	id: string
	date_added: string
	item_json: string
	listing_json: string
	name: string
	has_image: boolean
	messaged_at: null | string
}

export type GuildStashTab = {
	i: number,
	n: string
	type: string | 'PremiumStash' | 'QuadStash' | 'UniqueStash'
}
