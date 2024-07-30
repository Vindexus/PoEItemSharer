import dotenv from 'dotenv'
import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, '.env')
dotenv.config({
	path: envPath,
})

export type Config = {
	// Where the Express server runs
	PORT: number

	// The IDs of discord channels you want the bot to post to.
	DISCORD_CHANNELS: string[]

	// Your personal accounts session ID. Required to fetch items from a private server.
	POESESSID: string

	// GGG asks that you set one of these for your bots
	USER_AGENT: string


	// Your league name as it appears in the URL when you use the trade site
	// EG "Standard", "Chance%20To%20Unresist%20Poison%20(PC1337)"
	LEAGUE: string

	// Where the sqlite database file is
	DATABASE_FILE: string

	// Needed for your bot to post things
	DISCORD_TOKEN?: string

	// How long between iterations that look for new items in the db that do not have
	// images generated yet
	GENERATE_IMAGES_DELAY_MS: number

	// How long between iterations of checking the trade API for new items
	FETCH_ITEMS_DELAY_MS: number

	// How long to wait between trying to fetch the guild stash again
	FETCH_GUILD_STASH_DELAY_MS: number

	// How much longer to wait if no items are inserted. This is cummulative.
	FETCH_GUILD_STASH_DELAY_INCREMENT_MS: number

	// Never wait longer than this
	FETCH_GUILD_STASH_DELAY_MAX_MS: number

	FETCH_GUILD_ACCOUNT_NAME: string
	FETCH_GUILD_STASH_TAB_NAMES: string[]
	FETCH_GUILD_REALM: 'pc'


	// How long between iterations of the code that checks for new images to share
	// to discord
	DISCORD_MESSAGE_DELAY_MS: number
}

type ValidationOpts = {
	required?: boolean
	requiredInDev?: boolean
	requiredInProd?: boolean
	devOnly?: boolean
	boolean?: boolean
}


export function getConfigFromSource (source: Record<string, string>) : Config {
	const errors : string[] = []

	function validate (name: string, opts?: ValidationOpts) : boolean {
		if (!opts) {
			return true
		}

		if (opts.required && (opts.requiredInDev || opts.requiredInProd)) {
			throw new Error("A config setting cannot be both required and required in specific environments")
		}

		if (opts.devOnly && (opts.requiredInProd || opts.required)) {
			throw new Error('A config setting cannot be required and dev only, or required in prod and dev only')
		}

		const srcVal = source[name]
		if (!srcVal && opts.required) {
			errors.push(`${name} is required in all modes`)
			return false
		}

		if (srcVal && opts.boolean) {
			if (srcVal !== '1' && srcVal !== '0') {
				errors.push(`${name} is in invalid boolean. Must be 1 or 0, found "${srcVal}"`)
				return false
			}
		}

		return true
	}

	function loadBoolean (name: string, opts: ValidationOpts = {}) : boolean {
		if (!validate(name, {...opts, boolean: true})) {
			return false
		}

		const val = source[name] === '1'
		return val
	}

	function loadRequiredString (name: string) : string {
		return loadString(name, {
			required: true,
		})
	}

	function loadRequiredInt (name: string) : number {
		return loadInt(name, {
			required: true,
		})
	}


	function loadString (name: string, opts?: ValidationOpts, defaultValue?: string) : string {
		if (!validate(name, opts)) {
			return ''
		}

		const src = source[name]

		if (!src) {
			return defaultValue || ''
		}

		return source[name] as string
	}

	function loadStringArray (name: string, opts?: ValidationOpts) : string[] {
		if (!validate(name, opts)) {
			return []
		}

		return source[name] ? source[name]!.split(',') : []
	}

	function loadIntArray (name: string, opts?: ValidationOpts) : number[] {
		if (!validate(name, opts)) {
			return []
		}

		const src = source[name]
		if (!src) {
			return []
		}

		return source[name] ? source[name]!.split(',').map(parseInt) : []
	}

	function loadInt (name: string, opts?: ValidationOpts, defaultValue?: number) : number {
		if (!validate(name, opts)) {
			return 0
		}

		const src = source[name]

		if (!src) {
			return defaultValue || 0
		}

		const parsed = parseInt(src)
		if (src.toString() !== parsed.toString()) {
			errors.push(`${name} is not an integer`)
			return 0
		}

		return parsed
	}

	function loadEnum<T extends string> (name: string, valid: T[], defaultValue?: T) : T {
		const src = source[name]
		if (!src) {
			if (defaultValue) {
				return defaultValue
			}

			errors.push(`Missing value for ${name}. Valid options: ${valid.join(' or ')}`)
			return '' as unknown as T
		}


		const validStrs = valid.map(v => v.toString())
		if (!validStrs.includes(src)) {
			errors.push(`Invalid ${name} value "${src}". Valid options: ${valid.join(' or ')}`)
		}
		return src as unknown as T
	}


	/**
	 * For ensuring that you have at least one of these values
	 * EG: Have at least one of either LOGGER_API_KEY or LOGGER_LOG_FILE
	 * @param varNames
	 */
	function requireAtLeastOneOf (...varNames: any[]) {
		const missingAnyVal = varNames.filter((varName) => {
			const src = source[varName]

			return !src
		})
		if (missingAnyVal.length >= varNames.length) {
			errors.push(`Must have at least one of the following: ${missingAnyVal.join(', ')}`)
		}
	}

	function loadDelayMS (name: string, defaultValue = 5000) {
		const val = loadInt(name, {}, defaultValue)
		if (val < 50) {
			errors.push(`Times must be at least 50ms. ${name} is ${val}.`)
		}
		return val
	}

	const cfg : Config = {
		PORT: loadInt('PORT', {}, 3117),
		POESESSID: loadRequiredString('POESESSID'),
		LEAGUE: loadString('LEAGUE', {}, 'Standard'),
		DISCORD_CHANNELS: loadString('DISCORD_CHANNELS', {}, '').split(','),
		DISCORD_TOKEN: loadString('DISCORD_TOKEN'),
		USER_AGENT: loadRequiredString('USER_AGENT'),
		DATABASE_FILE: loadString('DATABASE_FILE', {}, 'db.sqlite'),
		FETCH_ITEMS_DELAY_MS: loadDelayMS('FETCH_ITEMS_DELAY_MS'),
		GENERATE_IMAGES_DELAY_MS: loadDelayMS('GENERATE_IMAGES_DELAY_MS'),
		DISCORD_MESSAGE_DELAY_MS: loadDelayMS('DISCORD_MESSAGE_DELAY_MS'),

		FETCH_GUILD_ACCOUNT_NAME: loadRequiredString('FETCH_GUILD_ACCOUNT_NAME'),
		FETCH_GUILD_STASH_TAB_NAMES: loadStringArray('FETCH_GUILD_STASH_TAB_NAMES').map(x => x.toLowerCase()),
		FETCH_GUILD_REALM: loadEnum('FETCH_GUILD_REALM', ['pc'], 'pc'), // TODO: Add the other realms if you want console
		FETCH_GUILD_STASH_DELAY_MS: loadDelayMS('FETCH_GUILD_STASH_DELAY_MS', 15000),
		FETCH_GUILD_STASH_DELAY_INCREMENT_MS: loadDelayMS('FETCH_GUILD_STASH_DELAY_INCREMENT_MS', 5000),
		FETCH_GUILD_STASH_DELAY_MAX_MS: loadDelayMS('FETCH_GUILD_STASH_DELAY_INCREMENT_MS', 1000 * 60 * 30),
	}

	if (cfg.FETCH_GUILD_STASH_TAB_NAMES.length === 0) {
		errors.push('No tab names provided for the guild stash')
	}

	if (errors.length > 0) {
		throw new Error(errors.join('\n'))
	}

	return cfg
}

function loadConfigFromDotEnv () : Config {
	const envFileContents = fs.readFileSync(envPath, 'utf8')
	// Look for duplicates. Those are likely to cause confusion, so we throw errors for those
	const lines = envFileContents.split('\n')
	const errors : string[] = []
	const keysFound :string[] = []
	lines.forEach((line) => {
		if (!line) {
			return
		}
		const parts = line.split('=').map(x => x.trim())

		if (line.indexOf(' = ') >= 0) {
			errors.push('Dont put spaces around the equals: ' + line)
		}

		const key = parts[0]?.trim()
		if (!key) {
			return
		}

		if (keysFound.includes(key)) {
			errors.push(`The key "${key}" is in the .env file more than once`)
		}
		keysFound.push(key)
	})

	if (errors.length > 0) {
		throw new Error(errors.join('\n'))
	}

	return getConfigFromSource(process.env as Record<string, string>)
}

const cfg = loadConfigFromDotEnv()

export default cfg
