import {Color, ColorKey} from "./types/color-types";

export const HELLO = 'world'
export const WORLD = 'hello'

export const COLORS : Record<ColorKey, Color> = {
	red: {
		hex: '#FF0000',
		key: 'red',
	},
	green: {
		hex: '#00FF00',
		key: 'green',
	},
	blue: {
		hex: '#0000FF',
		key: 'blue',
	}
}
