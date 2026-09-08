# Ebook access: what the app expects from `book-gift-api`

This file lives in `.github/` so it is never published with the site.

The reader at `/ebook/` talks to one Edge Function, `book-gift-api`, and uses
these actions today:

| action | purpose |
| --- | --- |
| `exchange` | trades a one-time `#gift=<64 hex>` token for a device session |
| `access` | confirms a stored session still has an entitlement, returns chapter metadata |
| `chapter` | returns one chapter's text for an entitled session |
| `progress_get` / `progress_save` | reading position |

## One action still to add: `link_request`

The app now offers a reader who has lost their session a way back in without
going through their inbox archaeology or asking for help. It posts:

```json
{ "action": "link_request", "email": "reader@example.com" }
```

and expects, on success:

```json
{ "sent": true }
```

Anything else — an error, an unknown action, a non-2xx — is treated by the app
as "not available yet", and the reader is handed a prefilled message to
`withlovefmb@gmail.com` instead. **The frontend needs no change when this ships.**
The automatic path lights up on its own the first time the function answers.

### What the function must do

1. Look up an **active entitlement** for that email. If there is none, still
   respond `{ "sent": true }` and send nothing. Never confirm or deny whether an
   address owns the book — that turns the endpoint into a customer list.
2. Mint a fresh one-time token, exactly as the original invitation does, and
   email it as a link to `/ebook/#gift=<token>`.
3. Rate limit per address and per IP. A handful an hour is generous.
4. Expire the token on a short window, and on first use.

### Why it is worth adding

Today a reader who opens their invitation inside their email app's built-in
browser spends the one-time token in a browser they will never return to. The
app now warns before that happens, but the warning is only a warning. Being able
to send yourself a fresh link is what makes "one verification is enough"
actually true.

## Page numbers in the reader

The contents list and the reading bar show page numbers **only** when the
`access` response carries enough to derive them honestly. The app looks, per
section, for any of:

- `page` or `start_page` — an explicit first page, used as-is
- `words` or `word_count` — pages derived at 280 words per page
- `chars`, `char_count` or `length` — words estimated first, then pages

If none of these are present the page column is absent and the layout closes up.
Adding `words` to each entry of the `access` chapter metadata is the smallest
change that turns page numbers on, and again needs no frontend work.

## The book on the reader's device

The app keeps chapter text in `localStorage` under `trwtl.gift.library`:
everything read, plus anything pulled down by "Save the whole book" in
Preferences. That is what makes the installed app open on a plane instead of
opening to an error, and what search reads.

Two rules keep that honest, and both are in `ebook/index.html`:

1. **An `access_required` answer erases it.** Not "stops adding to it" —
   erases it, along with the cached manifest, before anything is drawn. A copy
   that outlived its entitlement is the one failure mode worth being strict
   about.
2. **An unreachable service does not.** A network error is not a verdict, so the
   reader keeps reading from their device and the app obeys the next real answer
   it gets. This is the same trade every downloaded ebook makes.

Preferences shows how many sections are held and offers to delete all of them,
so a reader on a shared or borrowed device can leave nothing behind.
