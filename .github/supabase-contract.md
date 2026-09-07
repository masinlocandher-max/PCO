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

The browser talks to one Edge Function:

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
