import express, {Express, Request, Response} from "express";
import path from 'path'
import config from "../config";
import {getItem, query} from '../db/db'
import {inspect} from 'util'
import {Property, PropertyValue} from "../types/types";

const app: Express = express();
const port = config.PORT;

const HEAD = (title: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>`
const FOOTER = `</body></html>`

app.use(express.static(path.join(__dirname, 'public')))

app.get("/", (req: Request, res: Response) => {
	res.send("Welcome to the item viewer");
});

const modSort = [
	new RegExp(/to maximum life/i),
	new RegExp(/(Cold|Fire|Lightning|Physical|Chaos) damage to attacks/i),
	new RegExp(/to (Strength|Dexterity|Intelligence)/i),
	new RegExp(/% increased spell damage/i),
	new RegExp(/% to all Elemental Resistances/i),
]

function renderSection (lines: (string|undefined)[], className = '') {
	return `<section class="${className||''}">
	${lines.filter(x => !!x).map(x => `<div>${x}</div>`).join('\n')}
</section>`
}

function getValNum (propVal: PropertyValue) : string | number {
	if (!propVal || !propVal.length) {
		return 'N/A'
	}

	if (!propVal[0]!.length) {
		return 'N/A'
	}

	return propVal[0]![0]!
}

function renderProperty (prop: Property) : string {
	return renderLabelValue(prop.name, getValNum(prop.values))
}

type RenderLabelValueOpts = {
	blueValue?: boolean
	swapped?: boolean
}
function renderLabelValue (label: string, value: string | number, opts :RenderLabelValueOpts = {}) {
	const labelHTML = `<label>${label}</label>`
	const valHTML = `<span class="value">${value}</span>`

	const pieces = [labelHTML, valHTML]

	if (opts.swapped) {
		pieces.reverse()
	}

	return `<span class="prop ${opts.blueValue ? ' blue-value' : ''}">${pieces.join('\n')}</span>`
}

function newHandler (fn: (req: Request, res: Response) => Promise<any>){
	return async (req: Request, res: Response) => {
		try {
			await fn(req, res)
		}
		catch (ex) {
			console.error(ex)
			res.status(500).send(ex.toString())
		}
	}
}

app.get('/items', newHandler(async (req: Request, res: Response) => {
	const items = await query<{id: string, date_added: string, item_json: string}[]>(`SELECT id, item_json, date_added FROM items ORDER BY date_added DESC LIMIT 100`)
	res.send(HEAD('ITEMS') + items.map((item) => {
		const itemInfo = item.item_json ? JSON.parse(item.item_json) : {}
		const name = itemInfo.name || ''
		const typeLine = itemInfo.typeLine || ''

		console.log('items.length', items.length)
		return `<div style="color: white;">

<a href="/item/${item.id}">
	${name} ${typeLine} @ ${item.date_added}
</a>
<div style="font-size: 10px;">${item.item_json}</div>
</div>`
	}) + FOOTER)
}))

app.get("/item/:itemId", newHandler(async (req: Request, res: Response) => {
	const itemId = req.params.itemId
	const itemInfo = await getItem(itemId)
	console.log('listing', inspect(itemInfo, {showHidden: false, depth: null, colors: true}))

	if (!itemInfo) {
		res.status(404).send(`Could not find with item ${itemId}`)
		return
	}


	const item = itemInfo.item
	const classes : string[] = []

	function addModSection (mods: undefined | string[], className = '') {
		if (!mods) {
			return
		}

		const modLines = mods.map((mod) => {
			return `<span class="mod ${className}">${mod}</span>`
		})

		sections.push(renderSection(modLines))
	}

	const sections : string[] = []
	const header :string [] = []
	header.push(item.name || item.typeLine || 'N/A')

	if (!item.rarity || item.rarity !== 'Normal') {
		header.push(((item.rarity ? (item.rarity + ' ') : '') + item.baseType))
	}

	if (header[0] === header[1]) {
		header.pop()
	}

	if (item.rarity) {
		classes.push(item.rarity.toLowerCase())
	}

	sections.push(renderSection(header, 'header'))

	function getDefenseLine (label: string, value: number|string, valueAt20: number|string, aug: boolean) {
		return renderLabelValue(label, value, {
			blueValue: aug
		}) + (value != valueAt20 && valueAt20 ? ('<span class="at-20-qual">(' + renderLabelValue('20% Qual:', valueAt20, {
			blueValue: aug,
		}) + ')</span>') : '')
	}

	if (item.properties) {
		const lines : string[] = []

		if (item.extended?.base_defence_percentile) {
			lines.push(renderLabelValue('Base Percentile', item.extended.base_defence_percentile + '%'))
		}

		item.properties.forEach((prop) => {
			let label = prop.name
			const val = getValNum(prop.values)
			if (prop.values.length === 0) {
				lines.push(`<div class="prop">${label}</div>`)
			}
			else if (prop.displayMode === 3) {
				for (let i = 0; i < prop.values.length; i++) {

					label = label.replace('{' + i + '}', `<span class="value">${prop.values[i][0]}</span>`)
				}
				lines.push(`<div class="prop">${label}</div>`)
			}
			else {
				if (label === 'Armour') {
					lines.push(getDefenseLine(label, val, item.extended?.ar, item.extended?.ar_aug))
					return
				}
				else if (label === 'Evasion Rating') {
					lines.push(getDefenseLine(label, val, item.extended?.ev, item.extended?.ev_aug))
					return
				}
				else if (label === 'Energy Shield') {
					lines.push(getDefenseLine(label, val, item.extended?.es, item.extended?.es_aug))
					return
				}
				lines.push(renderLabelValue(label, val))
			}
		})

		if (item.extended) {
			if (item.extended.dps) {
				lines.push(renderLabelValue('DPS at max Quality', item.extended.dps, {
					blueValue: item.extended.dps_aug
				}))
			}
			if (item.extended.pdps) {
				lines.push(renderLabelValue('Physical DPS at max Quality', item.extended.pdps))
			}
		}

		sections.push(renderSection(lines))
	}

	if (item.requirements || item.ilvl) {
		const lines : string[] = []

		if (item.ilvl) {
			lines.push(renderLabelValue('Item Level', item.ilvl))
		}

		if (item.requirements) {
			const reqs : string[] = []
			item.requirements.forEach((req) => {
				const num = getValNum(req.values)
				if (req.name === 'Level') {
					reqs.push(renderLabelValue('Level', getValNum(req.values)))
				}
				else {
					reqs.push(renderLabelValue(req.name, num, {
						swapped: true,
					}))
				}
			})

			lines.push(`Requires ${reqs.join(', ')}`)
		}
		sections.push(renderSection(lines))
	}

	addModSection(item.enchantMods, 'enchant')
	addModSection(item.implicitMods)

	type ModLine = {
		text: string,
		className: string,
		sort: number
	}

	function mapMods (mods: undefined | string[], className = '') : ModLine[] {
		if (!mods) {
			return []
		}


		return mods.map((mod, idx) :ModLine  => {
			return {
				text: mod,
				className,
				sort: 0,
			}
		})
	}

	const explicit = mapMods(item.explicitMods) as ModLine[]
	let mods : ModLine[] = ([] as ModLine[])
		.concat(explicit)
		.concat(mapMods(item.craftedMods, 'crafted'))
		.concat(mapMods(item.fracturedMods, 'fractured'));

	mods = mods.map((mod, idx) => {
		let sort = (mods.length * 2) + idx

		if (mod.className === 'crafted') {
			sort = sort * 2
		}
		else {
			for (let i = 0; i < modSort.length; i++) {
				if (mod.text.match(modSort[i]!)) {
					sort = i
					break
				}
			}
		}


		mod.sort = sort
		return mod
	})
	.sort((a, b) => {
		return a.sort < b.sort ? -1 : 1
	})

	if (item.veiledMods) {
		item.veiledMods.forEach((veiled) => {
			mods.push({
				text: `<img src="/veiled.gif" />`,
				sort: veiled.indexOf('efix') ? 0 : 100,
				className: 'veiled',
			})
		})
	}

	if (mods.length > 0) {
		sections.push(renderSection(mods.map((mod) => {
			return `<div data-sort="${mod.sort}" class="mod ${mod.className}">${mod.text}</div>`
		})))
	}

	const extras : string[] = []
	if (!item.identified) {
		extras.push(`<span class="unidentified">Unidentified</span>`)
	}

	if (item.corrupted) {
		if (Math.random() < 0.01) {
			extras.push(`<span class="corrupted krangled">Krangled</span>`)
		}
		else {
			extras.push(`<span class="corrupted">Corrupted</span>`)
		}
	}

	if (extras.length) {
		sections.push(renderSection(extras))
	}

	let sockets : string = ''
	if (item.sockets) {
		let prevGroup = 0
		let groups : string[][] = []
		let group : string[] = []

		let link = 0;

		item.sockets.forEach((socket, idx) => {
			if (prevGroup !== socket.group && idx > 0) {
				groups.push([...group])
				group = []
				link = Math.max(0, link-1)
			}

			group.push(socket.sColour)
			link++
			prevGroup = socket.group
		})

		groups.push([...group])

		sockets = `<div class="sockets">
			<span class="link-count">${link} Link</span>
			<div>
				${groups.map(group => {
					return `<span class="group">${group.map(s => `<span class="${s}">${s}</span>`).join('<span>-</span>')}</span>`
				}).join('')}
			</div>
	</div>`
	}

	const icons : string[] = []

	if (item.influences) {
		for (let [influence, has] of Object.entries(item.influences)) {
			if (has) {
				icons.push(`<div class="${influence}"></div>`)
			}
		}
	}


	if (item.veiled) {
		icons.push(`<div class="veiled"></div>`)
	}

	if (item.synthesised) {
		icons.push(`<div class="synthesised"></div>`)
	}
	if (item.searing) {
		icons.push(`<div class="searing"></div>`)
	}
	if (item.tangled) {
		icons.push(`<div class="eater"></div>`)
	}

	if (item.fracturedMods?.length) {
		icons.push(`<div class="fractured"></div>`)
	}

	let html = HEAD(`Viewing Item ${itemId}`) + `
    <div class="listing ${classes.join(' ')}">
    	<div class="item">
				<aside>
					<figure>
						${icons ? `<div class="icons num-${icons.length}">${icons.join('')}</div>`: ''}
						<img src="${item.icon}" />
					</figure>
					${sockets}
				</aside>
				<main>
					${sections.join('<div class="separator"></div>').split('+').join('<strong>+</strong>')}
				</main>
			</div>
			${itemInfo.listing && itemInfo.listing.account ? `
				<div class="posted-by">
					Posted by <span class="account-name">${itemInfo.listing?.account?.name}</span> @ ${new Date(itemInfo.listing?.indexed || Date.now()).toISOString()}
				</div>
			` : ''}
    </div>
    
    <div class="actions">
			<a href="/random">random item</a>			    
			<ul>
				<li>${itemInfo.has_image ? `<a href="/images/items/${itemInfo.id}.png">view image</a>` : '[no image]'}</li>
				<li>${itemInfo.stash_tab_name ? `In tab ${itemInfo.stash_tab_name} [${itemInfo.stash_tab_pos}]` : '[no tab]'}</li>
			</ul>
		</div>

` + FOOTER
	res.send(html)
}));

app.get('/random', async (_req: Request, res: Response) => {
	const rand = await query<{id: string}[]>(`SELECT id FROM items ORDER BY RANDOM() LIMIT 1`)
	if (!rand[0]) {
		res.send(';(')
		return
	}

	res.redirect(`/item/${rand[0].id}`)
})
app.get('/latest/:num', async (req: Request, res: Response) => {
	const offset = req.params.num || 0
	const rand = await query<{id: string}[]>(`SELECT id FROM items ORDER BY date_added DESC LIMIT 1 OFFSET ${offset}`)
	if (!rand[0]) {
		res.send(';(')
		return
	}

	res.redirect(`/item/${rand[0].id}`)
})

app.listen(port, async () => {
	console.log(`[server]: Server is running at http://localhost:${port}`);

	const items = await query<any[]>(`SELECT id, name, date_added, has_image FROM items ORDER BY date_added DESC LIMIT 50`)
	console.log(`Found ${items.length} item(s)`)
	items.forEach((item: any) => {
		console.log(`${item.name}: http://localhost:${port}/item/${item.id}`)
	})

	if (items[0]) {
		console.log(items[0])
	}
});

process.on('SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
	// some other closing procedures go here
	process.exit(0);
});
