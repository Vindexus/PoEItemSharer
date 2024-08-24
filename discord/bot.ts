import {AttachmentBuilder, ButtonStyle, Client, Events, GatewayIntentBits} from 'discord.js';
import config from '../config'
import {ItemInfo} from "../types/types";
import {getTradeListingImagePath, wait} from "../lib/helpers";
import {getItemsToMessage, query} from "../db/db";


// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async (readyClient: Client) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

/*
	readyClient.guilds.cache.forEach(guild => {
		console.log(`${guild.name} | ${guild.id}`);
	})
*/

	async function sendItem (listing: ItemInfo, channelId: string) {
		let prepend = ''
		if (listing.stash_tab_name) {
			prepend = 'In guild stash tab **' + listing.stash_tab_name + '** `[' + listing.stash_tab_pos + ']`'
		}
		const message = await readyClient.channels.cache.get(channelId).send({
			content: prepend,
			files: [
				new AttachmentBuilder(getTradeListingImagePath(listing), {
					name: 'item-' + listing.id + '.png',
				})
			]
		})

	}


	const channels = readyClient.channels.cache.values()
	for (let channel of channels) {
		console.log(channel.name + ' in ' + channel.guild.name + ' ' + channel.id)
	}
	const channelsToMessage = config.DISCORD_CHANNELS.map((c) => {
		return c
	})
	let num = 0
	const loopForever = true
	do {
		num++
		const items = await getItemsToMessage()
		console.log(`Found ${items.length} listings to post to ${channelsToMessage.length} channels`)
		if (items.length > 0) {
			let numSentInThisBatch = 0
			let maxPerBatch = 5
			for (let itemRow of items) {
				console.log(`Sending ${itemRow.id} to channels`)
				if (numSentInThisBatch > maxPerBatch) {
					console.log('Sent too many so far, taking a break')
					break
				}
				await Promise.all(channelsToMessage.map((cid) => {
					numSentInThisBatch++
					return sendItem(itemRow, cid)
				}))
				await query(`UPDATE items SET messaged_at = ? WHERE id= ?`, [new Date().toISOString(), itemRow.id])
				console.log(`Waiting ${config.DISCORD_MESSAGE_DELAY_MS}ms`)
				await wait(config.DISCORD_MESSAGE_DELAY_MS)
			}
		}
		if (loopForever) {
			console.log(`Waiting ${config.DISCORD_MESSAGE_DELAY_MS}ms`)
			await wait(config.DISCORD_MESSAGE_DELAY_MS)
		}
	}
	while (loopForever);
});

// Log in to Discord with your client's token
client.login(config.DISCORD_TOKEN);

process.on('SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
	// some other closing procedures go here
	process.exit(0);
});
