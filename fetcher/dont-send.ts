import {run} from "../lib/helpers";
import {query} from "../db/db";

run(async () => {
	const result = await query(`UPDATE items SET dont_message = 1`)
	console.log('result', result)
})
