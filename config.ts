import dotenv from 'dotenv'
import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, '.env')
dotenv.config({
	path: envPath,
})

export type Config = {
	PORT: number
	DISCORD_CHANNELS: string[]
	POESESSID: string
	USER_AGENT: string
	LEAGUE: string // Standard, Chance%20To%20Unresist%20Poison%20(PL46381)
	DATABASE_FILE: string
	DISCORD_TOKEN?: string
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

	function loadEnum<T extends string> (name: string, valid: T[]) : T {
		const src = source[name]
		if (!src) {
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

	const cfg : Config = {
		PORT: loadInt('PORT', {}, 3000),
		POESESSID: loadRequiredString('POESESSID'),
		LEAGUE: loadString('LEAGUE', {}, 'Standard'),
		DISCORD_CHANNELS: loadString('DISCORD_CHANNELS', {}, '').split(','),
		DISCORD_TOKEN: loadString('DISCORD_TOKEN'),
		USER_AGENT: loadRequiredString('USER_AGENT'),
		DATABASE_FILE: loadString('DATABASE_FILE', {}, 'db.sqlite')
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
