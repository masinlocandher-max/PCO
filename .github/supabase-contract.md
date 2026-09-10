# Supabase contract for The Right Way to Live

This file lives in `.github/` so it is excluded from the deployed site. It documents the production contract. Do not replace this architecture with a public chapters table.

## Security boundary

The public PCO repository contains only the campaign, reader shell, the intentional preview, static assets, the Supabase project URL, and a browser-safe publishable key.

The following must never be committed or served by GitHub Pages:

- full manuscript text
- chapter JSON bundles
- manuscript `.txt`, `.epub`, `.docx`, or equivalent files
- Supabase `service_role` keys
- payment secrets
- private database credentials

The build validator rejects manuscript-like files and server-only credentials. That is defense in depth, not a substitute for keeping protected data server-side.

## Production data model

The manuscript is stored in the private schema:

- `book_private.book_chapters` — 58 verified sections for `the-right-way-to-live`
- `book_private.book_release` — release readiness and expected section count
- `book_private.book_orders` / `book_private.book_order_events` — server-managed orders
- `book_private.reader_access_log` — private access audit data

Reader-facing account state lives in:

- `public.book_entitlements` — purchaser access grants, with RLS enabled
- `public.book_reader_progress` — per-user reading progress, with RLS enabled

There is deliberately **no `public.chapters` table** and no public REST endpoint that can page through the manuscript.

The private manuscript tables have no `anon` or `authenticated` table privileges. They are used only through server-side code running with the required privilege.

## Production API

The browser talks to **four** Edge Functions and to Supabase Auth directly. Every
one of them is listed below. `scripts/validate-site-assets.py` fails the build if
published code calls an endpoint that has no section here, so this list cannot
silently fall behind the site again — which is what happened when the ebook app
shipped against `book-gift-api` while this file still said "one Edge Function".

Sections marked **MUST VERIFY** describe controls that live in the Edge Function
source, which is not in this repository. They are written here so that whoever
holds Supabase access can check them against the deployed code. Nothing in this
repository can enforce them, and no reviewer should assume they hold because they
are written down.

### book-api

`POST /functions/v1/book-api`

Allowed production origins are:

- `https://francinemariebautista.com`
- `https://www.francinemariebautista.com`

The Edge Function uses the runtime-provided service credential only on the server. It verifies the user bearer token with Supabase Auth, requires a confirmed non-anonymous user and a live session, then calls the server-side `book_backend` RPC.

Supported actions:

- `catalog` — public prices and release readiness only
- `create_order` — authenticated pending-order creation
- `orders` — authenticated user's own order summaries
- `access` — checks the user's ebook entitlement and returns chapter metadata only
- `chapter` — checks entitlement again and returns one requested chapter only

Protected responses use `Cache-Control: private, no-store`.

### book-gift-api

`POST /functions/v1/book-gift-api` — the endpoint `/ebook/` uses, and the path most
readers actually take. Called **anonymously**: no `Authorization` header, no
`apikey`, no Supabase Auth user. The only credential is an opaque 64-hex `session`
string in the JSON body, held in `localStorage` under `trwtl.gift.session`.

Actions: `exchange` (one-time link token → session), `access` (session → chapter
manifest), `chapter` (session + sequence → one chapter body), `link_request`
(email → send a fresh link).

This design is deliberate — one email verification, then the device is the key —
but it means the session string alone is worth the whole manuscript, and the
function is the only thing standing behind it.

**MUST VERIFY:**

- `exchange` spends the link token exactly once, atomically. Two simultaneous
  requests with the same token must not both return a session.
- Link tokens expire on a short window, and expiry is checked server-side.
- Sessions carry an absolute expiry and can be revoked. A reader who loses a
  phone has no way to invalidate it from the app — revocation must exist on the
  server side or it does not exist at all.
- `chapter` re-checks entitlement on every call and returns exactly one section.
- `link_request` answers identically whether or not the address owns the book, so
  the endpoint cannot be used to test who bought it.
- `link_request` is rate limited per address **and** per source. It sends email on
  an unauthenticated request: without a limit it is a way to bill FMB for
  delivering mail to strangers, and to attach her sending domain to it.
- `chapter` is rate limited per session. The app's own "Search the whole book"
  button walks every section in a loop (`indexBook()`), so one-section-at-a-time
  delivery is not, by itself, a brake on bulk extraction.
- Responses carry `Cache-Control: private, no-store`.

### book-paymongo-api

`POST /functions/v1/book-paymongo-api` — checkout. Authenticated with a Supabase
Auth bearer token. Actions: `create_checkout` (order id → PayMongo checkout URL),
`status` (order id → payment state).

The browser sends **no amount and no currency**; it sends only an order id. Price
must be read from the order record server-side. The client also refuses any
`checkout_url` that is not on `https://checkout.paymongo.com/`, which is defence
in depth against an open redirect, not an authorisation control.

**MUST VERIFY:**

- The order id is scoped to the authenticated caller. `create_checkout` and
  `status` on someone else's order id must be refused, not answered.
- Entitlement is granted **only** by a PayMongo webhook whose signature has been
  verified against the webhook secret, and only after confirming the paid amount
  and currency match the order. A `success` redirect is a browser navigation an
  attacker controls; it must grant nothing.
- Webhook handling is idempotent by event id. A replayed webhook must not grant a
  second entitlement or a second fulfilment.
- The PayMongo secret key exists only in the Edge Function environment.

### book-admin-api

`POST /functions/v1/book-admin-api` — the administration surface at `/book-admin/`,
which is published like any other page and protected only by what this function
checks. Authenticated with a Supabase Auth bearer token.

The sign-in page sends `create_user: false`, so the admin form cannot mint an
account. That is correct and must stay.

**MUST VERIFY:**

- Every action re-checks that the caller holds an administrator role, server-side,
  on each request. The page being hard to find is not a control.
- The role is read from server-side state, never from the request body or a
  client-supplied claim.

### Supabase Auth, called directly

`/auth/v1/otp`, `/auth/v1/token`, `/auth/v1/logout`. These are Supabase's own
endpoints, not FMB's code, so **no Edge Function change can rate limit them** —
only the project's Auth configuration can.

`book/reader.js` and `book/book.js` call `otp` with `create_user: true`, from a
public page, with no challenge in front of it. That is what a reader flow needs,
and it also means one anonymous request causes one email to be sent to any address
the caller names.

**MUST VERIFY (provider configuration, not code):**

- Auth email rate limits are set deliberately in the Supabase dashboard rather
  than left at whatever the default is, and are known to whoever owns the bill.
- If custom SMTP is connected, its own per-message cost and sending reputation are
  understood to be exposed by this endpoint.
- CAPTCHA protection on Auth is considered. It is the only control that
  distinguishes a reader from a script here.
- Account creation being open is safe only for as long as the entitlement rule
  below holds. Signing in must never, on its own, grant the book.

## Entitlement rule

Signing in is not purchasing.

A reader receives protected chapter text only when `public.book_entitlements` contains a currently active entitlement for that authenticated user and `access_level` is `ebook` or `admin`.

Do not weaken this into a rule such as:

```sql
using (auth.uid() is not null)
```

That would give the book to anyone who creates an account.

## Reader behavior

`book/reader.js` uses Supabase passwordless email authentication. The browser-safe publishable key may be present in the frontend. A service-role key may not.

After sign-in:

1. The reader calls `access`.
2. If entitlement is active, the API returns a manifest with titles, kinds, sequences, and word counts, not bodies.
3. Selecting a section calls `chapter` for one sequence.
4. The API returns only that section plus purchaser watermark information.

The reader must never request or construct a full-book response.

## Caching and offline behavior

The service worker may cache the public app shell, styles, scripts, icons, imagery, and the intentional preview embedded in `reader.html`.

It must never cache:

- Supabase Auth responses
- access or entitlement responses
- order responses
- protected chapter responses

Cross-origin Supabase requests and non-static response shapes are network-only. Rotate the service-worker cache version whenever the reader security contract materially changes.

## Import lifecycle

The one-time manuscript import has completed and the staging payload has been destroyed. The database import RPCs and staging tables were removed after verification. The import and diagnostic Edge Functions are inert and require JWT verification.

If the manuscript must be replaced later, create a new short-lived import mechanism, verify count/order/hashes before publishing it, and retire that mechanism again immediately after the release is validated.

## Current release invariant

A release is considered ready only when `book_private.content_ready()` is true. It verifies that the published release's expected section count matches the private chapter table and that every stored section has valid content/hash state.

Do not manually mark an incomplete import as published.

## Payment status

The book backend supports secure order records, but payment mode is currently manual verification. Do not describe checkout or entitlement activation as automatic until a real payment provider and verified activation flow are connected.

## DRM reality

The system prevents unauthenticated access, static manuscript leakage, public full-book endpoints, and accidental caching of protected chapters. It cannot make text displayed to an authorized reader impossible to capture with screenshots, cameras, accessibility tooling, or determined browser automation. Watermarking and one-chapter delivery are deterrence and traceability measures, not absolute DRM.
