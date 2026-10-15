import { localIsoDate } from '@convex/lib/dates'

/**
 * Today's date on this device (yyyy-mm-dd). Always sent to the backend with "create"/"copy"
 * calls, because the server's clock is UTC and would be a day behind in the Malaysian morning.
 */
export function today(): string {
  return localIsoDate(new Date())
}
