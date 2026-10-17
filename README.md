# Invoices

A clean, simple invoicing web app: pick a template, fill in the invoice with a live preview, save it as a PDF, and track what's been paid. Log in from any device.

- **4 templates** — Blush (the original pink design), Classic, Minimal, Bold — each with an accent colour
- **Live A4 preview** with autosave; **Download PDF** uses the browser's "Save as PDF" (sharp, selectable text)
- **Paid / unpaid / overdue** tracking, totals on the dashboard, search and filters
- **Duplicate for next month** — new number, dates +1 month, "OCT 2026" → "NOV 2026"
- **Saved clients** (address, attention, usual notes such as vendor code)
- Tax (e.g. SST) and discount, PAID stamp, logo, CSV export and full JSON backup
- Email + password (6-digit email codes, password reset) and Google sign-in; sessions last 60 days while used

## Stack

React 19 + TypeScript + Vite, TanStack Router, Tailwind CSS v4, Radix UI, react-hook-form + zod.
Backend: [Convex](https://convex.dev) (database + functions) with Convex Auth. Emails: [Resend](https://resend.com).

```
convex/           backend functions, schema, auth; convex/lib = pure shared logic (money, dates, totals…)
src/routes/       pages (thin) — _guest = signed-out pages, _app = signed-in pages
src/features/     auth, invoices (dashboard), editor, clients, settings
src/components/   ui (buttons, fields, dialogs), shared, document (the invoice templates + print)
e2e/              Playwright end-to-end + accessibility tests
```

## Run it locally (no accounts needed)

```bash
npm install
npx playwright install chromium        # first time, for e2e tests
```

Mailpit (local email inbox): download `mailpit-windows-amd64.zip` (or your OS) from
https://github.com/axllent/mailpit/releases and put `mailpit.exe` in `.tools/mailpit/`
(git-ignored), or install it on your PATH.

```bash
# Terminal 1 — local Convex backend (runs on your machine, no account)
CONVEX_AGENT_MODE=anonymous npx convex dev
# once: sign-in keys, dev outbox and the Mailpit address
node scripts/dev-auth-env.mjs

# Terminal 2 — local inbox: http://localhost:8025
npm run mail

# Terminal 3 — the web app: http://localhost:5173
npm run dev
```

Sign-up and password-reset codes arrive in Mailpit at **http://localhost:8025**. They are also
kept in a dev outbox (used by the e2e tests), readable with:

```bash
npx convex run devOutbox:latest '{"email":"you@example.com"}'
```

## Checks

```bash
npm run lint          # ESLint (incl. architecture rules) + TypeScript
npm run format:check  # Prettier
npm test              # Vitest: backend (convex-test) + pages/components (Testing Library + axe)
npm run coverage      # with 80% thresholds
npm run e2e           # Playwright journey + WCAG AA checks (needs the terminals above;
                      # the Mailpit test is skipped if Mailpit isn't running)
```

## Going live — steps for you

1. **Convex account** (free): `npx convex login`, then `npx convex dev --configure` and choose "create a new project". This replaces the local deployment in `.env.local`.
2. **Sign-in keys** for that deployment: `npx @convex-dev/auth` (sets `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`).
   Do **not** run `scripts/dev-auth-env.mjs` against it — that turns on the dev outbox.
3. **Resend** (free tier): create an API key and run
   `npx convex env set AUTH_RESEND_KEY re_xxx`.
   Until you verify a domain in Resend, emails only go to your own Resend account address. With a domain:
   `npx convex env set AUTH_EMAIL_FROM "Invoices <no-reply@yourdomain.com>"`.
4. **Google sign-in** (optional):
   - Google Cloud Console → APIs & Services → Credentials → _Create OAuth client ID_ → Web application.
   - Authorised redirect URI: `https://<your-deployment>.convex.site/api/auth/callback/google`
     (the `.convex.site` URL is shown in the Convex dashboard).
   - `npx convex env set AUTH_GOOGLE_ID ...` and `npx convex env set AUTH_GOOGLE_SECRET ...`
   - OAuth consent screen → **Publish app** (otherwise only listed test users can sign in).
   - In the web app's environment set `VITE_AUTH_GOOGLE=true` to show the button.
5. **Deploy the web app** (e.g. Vercel, free): import the repo, set build command
   `npx convex deploy --cmd 'npm run build'`, output `dist`, and add the `CONVEX_DEPLOY_KEY`
   (Convex dashboard → Settings → Deploy keys) as an environment variable.
   Then set `SITE_URL` on the production Convex deployment to your site's URL.

## Known limitations / risks

- **Session tokens live in browser storage** (Convex Auth for single-page apps), not an httpOnly cookie like the `stock` app. Mitigation: React escapes all text, no raw HTML is rendered, and a strict Content-Security-Policy should be set on the host.
- **Personal data** (IC number, bank account) is stored in Convex (encrypted at rest, HTTPS). Every function checks the owner; `convex/access.test.ts` proves one account can't read another's data.
- **Resend without your own domain** only delivers to your own address — real users need a verified domain.
- **Convex Auth is labelled beta** and free-plan limits can change; use _Settings → Full backup_ regularly.
- **Print layout** is tuned for Chrome/Edge; check Safari/iOS before relying on it there. Very long invoices continue on a second page (the Blush tint only covers the first).
- The editor doesn't merge edits made to the **same invoice on two devices at once** — the last save wins.
