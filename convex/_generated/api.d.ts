/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as backup from "../backup.js";
import type * as bankAccounts from "../bankAccounts.js";
import type * as businesses from "../businesses.js";
import type * as clients from "../clients.js";
import type * as devOutbox from "../devOutbox.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as items from "../items.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_credentials from "../lib/credentials.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_defaultable from "../lib/defaultable.js";
import type * as lib_defaults from "../lib/defaults.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_invoiceMath from "../lib/invoiceMath.js";
import type * as lib_itemKey from "../lib/itemKey.js";
import type * as lib_logo from "../lib/logo.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_monthShift from "../lib/monthShift.js";
import type * as lib_numbering from "../lib/numbering.js";
import type * as lib_rules from "../lib/rules.js";
import type * as lib_templateSwitch from "../lib/templateSwitch.js";
import type * as lib_validators from "../lib/validators.js";
import type * as otp from "../otp.js";
import type * as profiles from "../profiles.js";
import type * as templates from "../templates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  backup: typeof backup;
  bankAccounts: typeof bankAccounts;
  businesses: typeof businesses;
  clients: typeof clients;
  devOutbox: typeof devOutbox;
  http: typeof http;
  invoices: typeof invoices;
  items: typeof items;
  "lib/auth": typeof lib_auth;
  "lib/credentials": typeof lib_credentials;
  "lib/dates": typeof lib_dates;
  "lib/defaultable": typeof lib_defaultable;
  "lib/defaults": typeof lib_defaults;
  "lib/email": typeof lib_email;
  "lib/invoiceMath": typeof lib_invoiceMath;
  "lib/itemKey": typeof lib_itemKey;
  "lib/logo": typeof lib_logo;
  "lib/money": typeof lib_money;
  "lib/monthShift": typeof lib_monthShift;
  "lib/numbering": typeof lib_numbering;
  "lib/rules": typeof lib_rules;
  "lib/templateSwitch": typeof lib_templateSwitch;
  "lib/validators": typeof lib_validators;
  otp: typeof otp;
  profiles: typeof profiles;
  templates: typeof templates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
