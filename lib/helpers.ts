export function run (fn: Function) {
	fn()
}

export async function wait (time: number) {
	return new Promise<void>((res) => {
		setTimeout(() => {
			res()
		}, time)
	})
}
