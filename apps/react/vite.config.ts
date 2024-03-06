import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import pluginChecker from 'vite-plugin-checker';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
  	pluginChecker({
			typescript: true,
		}),
  	react(),
		tsconfigPaths({

		})
	],
	server: {
  	fs: {
			cachedChecks: false,
		}
	}
})
