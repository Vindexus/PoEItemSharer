import {ColorKey} from "@monorepo/consts/types/color-types";

export function getColorHex (key: ColorKey) : string {
	if (key === 'red') {
		return '#ff0000'
	}
	else if (key === 'green') {
		return '#00ff00'
	}

	return 'wuuut'
}
