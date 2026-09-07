# Supabase contract for the reader

This file lives in `.github/` on purpose: the deploy excludes that directory, so
it is never published with the site.

## The one rule

Supabase ships two keys.

- **anon key** — designed to be public. It is safe in the browser bundle *only
  because row level security decides what it can read*. With RLS off, or a
  policy that says `using (true)`, the anon key reads the whole table. Anyone
  can open the console and page through the manuscript.
- **service_role key** — bypasses row level security completely. It must never
  appear in this repository, in the client bundle, or in any file the site
  serves. Keep it in Edge Function secrets or your activation script's
  environment.

`scripts/validate-site-assets.py` decodes every JWT it finds and fails the
build on any role other than `anon`, so a service_role key cannot be deployed
by accident. Do not treat that as permission to be casual with it.

## Schema

```sql
-- Who has paid for what. Users may read their own row and nothing else.
-- There is deliberately no insert or update policy: only your server-side
-- activation (service_role) grants access, after payment is confirmed.
create table public.entitlements (
  user_id    uuid not null references auth.users on delete cascade,
  product    text not null check (product in ('ebook','pocketbook','listening')),
  status     text not null default 'pending'
             check (status in ('pending','active','revoked')),
  granted_at timestamptz,
  primary key (user_id, product)
);

alter table public.entitlements enable row level security;

create policy "read own entitlements"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- The book.
create table public.chapters (
  id         bigint generated always as identity primary key,
  number     int  not null unique,
  part       text,
  title      text not null,
  body       text not null,
  is_preview boolean not null default false
);

alter table public.chapters enable row level security;
```

`alter table ... enable row level security` is the line that matters. A table
created through the SQL editor has RLS **off** by default, and with RLS off
every policy below is decorative.

## Policies

```sql
create or replace function public.has_active_ebook()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = auth.uid()
      and e.product = 'ebook'
      and e.status  = 'active'
  );
$$;

create policy "anyone may read the preview"
  on public.chapters for select
  using (is_preview);

create policy "buyers may read the book"
  on public.chapters for select
  using (public.has_active_ebook());
```

Mark exactly one row `is_preview = true` — chapter 07 today.

### The mistake to avoid

```sql
-- WRONG. This gives the whole book to anyone who signs up,
-- because signing up is not paying.
using (auth.uid() is not null)
```

Signing in and having paid are different questions. The policy must reach the
`entitlements` table, which is what `has_active_ebook()` does.

## What the reader asks for

One request, the same for everyone:

```
GET {url}/rest/v1/chapters?select=number,part,title,body&order=number.asc
apikey:        <anon key>
Authorization: Bearer <user session token, or the anon key when signed out>
```

Row level security answers it differently depending on who asks: one chapter
for a visitor, all of them for a buyer. The client never decides — it renders
whatever comes back. That is the point: there is no check in the browser to
forge.

Configure it by defining this before `reader.js` loads:

```js
window.FMB_SUPABASE = {
  url: 'https://<project-ref>.supabase.co',
  anonKey: '<anon key>',
  getAccessToken: function () { /* return the signed-in session token */ }
};
```

With nothing configured the reader stays on the built-in preview, which is the
honest state while the backend is being built.

## If the manuscript lives in Storage rather than a table

Make the bucket **private**. A public bucket is a public URL, and a public URL
is a published book — no auth, no expiry, permanently linkable. Serve it with
short-lived signed URLs minted in an Edge Function that checks entitlement
first.

## Offline reading, honestly

Reading offline and preventing copying pull against each other, and no amount
of client code resolves that. Text that survives a flight is text on the
device.

The line worth holding: a paying reader having a local copy is what an ebook
*is* — Kindle does the same. What matters is that a non-buyer can never obtain
one, which is what the policies above enforce, and that each copy carries the
buyer's watermark so a leaked file has a name on it.

The service worker never caches chapter responses. If offline reading of
purchased chapters is wanted, store them deliberately (IndexedDB), show the
reader that a copy is held on the device, and give them a way to remove it.
