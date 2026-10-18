import { z } from 'zod'

// The site's security policy forbids eval. Tell zod not to probe for it (the probe only logs a
// blocked-eval error). Imported first in main.tsx, before any schema is built.
z.config({ jitless: true })
