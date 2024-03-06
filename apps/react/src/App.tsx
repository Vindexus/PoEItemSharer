import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {DEFAULT_HEIGHT_PX} from "@monorepo/consts/sizes";
import Button from "@monorepo/ui/Button";
import {getColorHex} from "@monorepo/ui/helpers";
import Span from "@monorepo/ui/Span";
import {HELLO} from "@monorepo/consts/consts";
import {RED} from "@monorepo/ui/colors";
import {Pong} from "@monorepo/consts/types/ping-pong";
import api from "./lib/api";

console.log('hello', HELLO)
console.log('sup', RED)
function App() {
  const [count, setCount] = useState(0)
	const [pong, setPong] = useState<Pong|null>(null)

	useEffect(() => {
		(async function () {
			const res = await api.get('/api/ping')
			console.log('res')
			setPong(res.data)
		})()
	}, [])

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Express</h1>
			<div>This is my monorepo boiler plate.</div>
			<h3>Hello: {HELLO}</h3>
			<h4>Color: {RED}</h4>
			<h5>Size: {DEFAULT_HEIGHT_PX}</h5>
			<h6>SUP? {getColorHex('red')}</h6>
			<Button/>
			<Span />
			<div>
				{pong && <div>Pong? {pong.pong} @ {pong.time.toString()}</div>}
			</div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
