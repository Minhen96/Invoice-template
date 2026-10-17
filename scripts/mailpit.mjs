// Starts Mailpit, a local email inbox for development: http://localhost:8025
// Sign-up and password-reset codes land here when the backend has AUTH_MAILPIT_URL set
// (see scripts/dev-auth-env.mjs). The binary lives in .tools/ (git-ignored); see README.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const exe = process.platform === 'win32' ? 'mailpit.exe' : 'mailpit'
const local = fileURLToPath(new URL(`../.tools/mailpit/${exe}`, import.meta.url))
const command = existsSync(local) ? local : 'mailpit' // fall back to one on PATH

const child = spawn(command, ['--listen', '127.0.0.1:8025', '--smtp', '127.0.0.1:1025'], {
  stdio: 'inherit',
})
child.on('error', () => {
  console.error(
    'Mailpit not found. Download it from https://github.com/axllent/mailpit/releases ' +
      `and put ${exe} in .tools/mailpit/ (or install it on your PATH).`,
  )
  process.exit(1)
})
child.on('exit', (code) => process.exit(code ?? 0))
