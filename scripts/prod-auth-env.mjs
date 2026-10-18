// Sets up sign-in on the PRODUCTION Convex deployment:
//   - a fresh key pair for session tokens (JWT_PRIVATE_KEY + JWKS)
//   - SITE_URL (the live web address)
// It never sets the dev-only switches (AUTH_DEV_OUTBOX / AUTH_MAILPIT_URL).
//
// Usage (the production deploy key from the Convex dashboard, kept out of your shell history):
//   PowerShell: $env:CONVEX_DEPLOY_KEY = 'prod:...'; node scripts/prod-auth-env.mjs https://invoices.dreavelab.com
//   bash:       CONVEX_DEPLOY_KEY='prod:...' node scripts/prod-auth-env.mjs https://invoices.dreavelab.com
// Running it again replaces the keys, which signs everyone out once.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'

const deployKey = process.env.CONVEX_DEPLOY_KEY ?? ''
if (!deployKey.startsWith('prod:')) {
  console.error('Set CONVEX_DEPLOY_KEY to the production deploy key (it starts with "prod:").')
  process.exit(1)
}
const siteUrl = process.argv[2]
if (!siteUrl?.startsWith('https://')) {
  console.error('Pass the live site address, e.g. https://invoices.dreavelab.com')
  process.exit(1)
}

const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
const pkcs8 = await exportPKCS8(privateKey)
const jwk = await exportJWK(publicKey)

const vars = {
  JWT_PRIVATE_KEY: pkcs8.trimEnd().replace(/\n/g, ' '),
  JWKS: JSON.stringify({ keys: [{ use: 'sig', ...jwk }] }),
  SITE_URL: siteUrl.replace(/\/$/, ''),
}

// The Convex CLI targets the deployment of CONVEX_DEPLOY_KEY. Run it with this Node directly (no
// shell), so values with spaces stay intact and nothing secret is echoed.
const convexCli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url))
for (const [name, value] of Object.entries(vars)) {
  execFileSync(process.execPath, [convexCli, 'env', 'set', name, '--', value], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  console.log(`set ${name}`)
}
