import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import {RED} from "@monorepo/ui/colors";
import {Pong} from "@monorepo/consts/types/ping-pong";

dotenv.config();

const app = express();
app.use(cors())
const port = process.env.PORT || '8232';

app.get('/', (req, res) => {
	res.send('Express + TypeScript Server');
});

app.get('/api/ping', (req, res) => {
	console.log(`You can import colors like ${RED}`)
	const pong : Pong = {
		pong: true,
		time: new Date(),
	}
	res.send(pong)
})

app.listen(port, () => {
	console.log(`[server]: Server is running at http://localhost:${port}`);
});

