# CLAUDE.md — Invoices web app

Clean, very easy invoicing: templates, live preview, PDF, paid/unpaid tracking, login from anywhere.
Setup, commands and deployment are in `README.md`.

## How we work

1. **Plan first.** Agree on the approach before writing code for anything non-trivial.
2. **Quality over speed.** Industry-standard, maintainable code; no unexplained hacks.
3. **Tests are part of every change.** New behaviour ships with tests; bug fixes ship with a test that fails before the fix. Never weaken a test to make it pass.
4. **Verify before saying done:** `npm run lint`, `npm test`, and use the change in the browser (golden path, empty/loading/error states, phone width). Report what was run.
5. **Tell the owner about risks** and about anything that needs their action (accounts, keys, domains).
6. Conventional commits; commit/push/deploy only when asked.

## Rules

- **Money is integer sen** everywhere (`convex/lib/money.ts`). Never store or add floats.
- **Dates are `yyyy-mm-dd` strings**; "today" always comes from the device (`src/lib/today.ts`), never the server clock (UTC).
- **Every Convex function starts with `requireUserId`** and loads documents with `getOwned` (`convex/lib/auth.ts`). Add a case to `convex/access.test.ts` for any new table or function.
- Server-side value checks live in `convex/lib/rules.ts`; errors are `ConvexError({ code, field })` mapped to copy in `src/lib/errors.ts`.
- Pure logic shared by backend and UI lives in `convex/lib` (no hyphens in Convex file names).
- Structure: `routes/` thin → `features/<name>/` (import only via `index.ts`; features never import each other) → shared `components/`, `hooks/`, `lib/`. Enforced by ESLint.
- Design tokens only (`src/styles/tokens.css`); no raw hex in app UI. The printed invoice (`src/components/document`) has its own palette.
- Accessibility: real buttons/links, labels, ≥ 44px touch targets, visible focus, AA contrast, colour never the only signal.
- Every list: skeleton while loading, "No X yet." when empty, "Couldn't load X." on error.
- Never commit secrets; only `VITE_*` public config in the web app.

## Testing

| Level            | Tools                                                          | Where                                       |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------- |
| Backend          | Vitest + convex-test                                           | `convex/*.test.ts`                          |
| Pure logic       | Vitest                                                         | `convex/lib/*.test.ts`, `src/lib/*.test.ts` |
| Pages/components | Vitest + Testing Library + axe, fake Convex (`src/testing`)    | next to the code                            |
| End-to-end       | Playwright + axe (WCAG 2.2 AA incl. contrast), desktop + phone | `e2e/`                                      |

Coverage gate: 80% lines/functions/statements, 75% branches.
