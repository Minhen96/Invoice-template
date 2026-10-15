// Sets up sign-in on a LOCAL / development Convex deployment in one go:
//   - a fresh key pair for session tokens (JWT_PRIVATE_KEY + JWKS)
//   - SITE_URL (where the web app runs)
//   - AUTH_DEV_OUTBOX=true, so sign-in codes are stored for tests instead of emailed
//
// Usage: node scripts/dev-auth-env.mjs [siteUrl]
// Never run against production: the dev outbox must stay off there.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'

const siteUrl = process.argv[2] ?? 'http://localhost:5173'
const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
const pkcs8 = await exportPKCS8(privateKey)
const jwk = await exportJWK(publicKey)

const vars = {
  JWT_PRIVATE_KEY: pkcs8.trimEnd().replace(/\n/g, ' '),
  JWKS: JSON.stringify({ keys: [{ use: 'sig', ...jwk }] }),
  SITE_URL: siteUrl,
  AUTH_DEV_OUTBOX: 'true',
}

// Run the Convex CLI with this Node directly (no shell), so values with spaces stay intact.
const convexCli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url))
for (const [name, value] of Object.entries(vars)) {
  execFileSync(process.execPath, [convexCli, 'env', 'set', name, '--', value], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  console.log(`set ${name}`)
}
