import { Client, Events, GatewayIntentBits, AttachmentBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } from 'discord.js';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

import config from '../config'
import {TradeListing} from "../types/types";
import {wait} from "../lib/helpers";
import {getUnsentTradeListings, query} from "../db/db";
import path from 'path'


// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async (readyClient: Client) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	readyClient.guilds.cache.forEach(guild => {
		console.log(`${guild.name} | ${guild.id}`);
	})

	async function sendItem (listing: TradeListing, channelId: string) {
		const message = await readyClient.channels.cache.get(channelId).send({
			files: [
				new AttachmentBuilder(path.join(__dirname, '..', 'express', 'public', 'images', 'items', listing.id + '.png'), {
					name: 'item-' + listing.id + '.png',
				})
			]
		})
		message.react('👍')
	}


	const channels = readyClient.channels.cache.values()
	for (let channel of channels) {
		console.log(channel.name + ' in ' + channel.guild.name + ' ' + channel.id)
	}
	const channelsToMessage = config.DISCORD_CHANNELS.map((c) => {
		return c
	})
	let num = 0
	while (true) {
		num++
		const listings = await getUnsentTradeListings()
		console.log(`Found ${listings.length} listings to post to ${channelsToMessage.length} channels`)
		if (listings.length > 0) {
			let numSentInThisBatch = 0
			let maxPerBatch = 5
			for (let listing of listings) {
				console.log(`Sending ${listing.id} to channels`)
				if (numSentInThisBatch > maxPerBatch) {
					console.log('Sent too many so far, taking a break')
					break
				}
				await Promise.all(channelsToMessage.map((cid) => {
					numSentInThisBatch++
					return sendItem(listing, cid)
				}))
				await query(`UPDATE items SET messaged_at = ? WHERE id= ?`, [new Date().toISOString(), listing.id])
			}
		}
		console.log('Waiting 10s')
		await wait(10000)
	}
});

// Log in to Discord with your client's token
client.login(config.DISCORD_TOKEN);
