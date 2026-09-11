import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const RIOT_HOST = /^[a-z0-9-]+\.api\.riotgames\.com$/

// Dev-only: proxies /riot-api/<api-host>/<path> to Riot's REST API, injecting the API key
// server-side from .env.local. This plugin only runs under `vite dev` — it's never part of
// `vite build`'s output, so the key never reaches a browser bundle (including the deployed
// GitHub Pages site). Only riotgames.com API hosts are allowed through, so this can't be
// abused as an open proxy to arbitrary URLs.
function riotApiDevProxy(apiKey: string): Plugin {
  return {
    name: 'riot-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/riot-api/', async (req, res) => {
        if (!apiKey) {
          res.statusCode = 500
          res.end('RIOT_API_KEY is not set in .env.local')
          return
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const [, host, ...rest] = url.pathname.split('/')
        if (!host || !RIOT_HOST.test(host)) {
          res.statusCode = 400
          res.end('Invalid or missing Riot API host in proxy path')
          return
        }
        try {
          const upstream = await fetch(`https://${host}/${rest.join('/')}${url.search}`, {
            headers: { 'X-Riot-Token': apiKey },
          })
          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
          const retryAfter = upstream.headers.get('retry-after')
          if (retryAfter) res.setHeader('Retry-After', retryAfter)
          res.end(Buffer.from(await upstream.arrayBuffer()))
        } catch (err) {
          res.statusCode = 502
          res.end(`Riot API proxy error: ${(err as Error).message}`)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/Lol-Build-Planner/',
    plugins: [react(), riotApiDevProxy(env.RIOT_API_KEY ?? '')],
  }
})
