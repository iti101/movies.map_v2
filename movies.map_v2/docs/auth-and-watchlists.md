# Auth, reviews, and watchlists

Novi student-backend login plus browser-only watchlists. Implementation: `src/API/novi.js`, `src/components/AuthModal.jsx`, `src/API/watchlist.js`, `src/context/WatchlistContext.jsx`, `src/pages/Watchlist.jsx`.

## In plain English

**Sign in** talks to a school API (Novi) and stores a login token in the browser. That token is what lets you **publish a review**. **Watchlists** are a separate notebook in `localStorage` — they never leave this device, and they are filed under your Novi user id.

Logging out forgets the token. The watchlist JSON stays on the machine; signing back into the same account shows it again.

## Novi HTTP

| Mode | Base URL |
| --- | --- |
| `npm run dev` | `/novi-api` → proxied in `vite.config.js` to `https://novi-backend-api-wgsgz.ondigitalocean.app` |
| Production / `preview` | `VITE_NOVI_API_URL`, or that same host if unset |

Every request sends:

- `Content-Type: application/json`
- `novi-education-project-id: <VITE_NOVI_PROJECT_ID>`
- `Authorization: Bearer <token>` when a token is passed

Error bodies prefer `detail` / `message` / `title`. Otherwise:

| HTTP | Fallback copy |
| --- | --- |
| 401 | Invalid email or password. |
| 400 | That account could not be created. The email may already be in use. |
| 403 | You are not allowed to do that. |
| other | Something went wrong. Please try again. |

### Session

`localStorage`: `noviToken`, `noviUser` (JSON), `isLoggedIn` (`'true'` / `'false'`).

`loadSession()` treats the token as valid if it decodes as JWT and `exp` is more than **5 seconds** in the future (no `exp` → treated as valid). An expired or missing token calls `clearSession()`.

`App` logout: `clearSession()`, drop React session state, close the watchlist, strip `watchlist` from `history.state`.

### Sign in

`POST /api/login` with `{ email, password }`. Needs a `token` in the JSON or it throws. User id is taken from `user.id` / `userId` / JWT `sub`. Roles come from `user.roles` or a single JWT `role`. Username is loaded from `GET /api/users/:id/profiles` when that call works; login still succeeds if it fails.

### Create account

1. `POST /api/users` `{ email, password, roles: ['user'] }`
2. `login` with the same email/password
3. Optional `POST /api/profiles` `{ userId, username }` — auth still succeeds if the profile row cannot be stored

`AuthModal` client checks before signup:

- Username **2–40** characters
- Password: length ≥ **8**, at least one digit, at least one non-alphanumeric
- Confirm password must match

Escape and backdrop click close the modal. Body scroll is locked while it is open. Switching Sign in ↔ Create account keeps the email field and clears the other inputs. Closing the dialog (`open` becomes false) resets mode to **Sign in** and wipes the form.

## Watchlists (local)

Key `watchlists` is a `{ [userId]: List[] }` map.

```js
{ id: string, name: string, items: [{ id, mediaType, title, imagePath, year }] }
```

If a user has never stored lists, they get one default list: `{ id: 'watchlist', name: 'Watchlist', items: [] }`. New lists get `crypto.randomUUID()`. Writes dispatch `watchlists-changed` so `WatchlistProvider` refreshes in the same tab.

| Function | Behavior |
| --- | --- |
| `getLists(userId)` | Stored array, or the default list if nothing is stored. `[]` if the user deleted every list. |
| `addToWatchlist` | Appends to **`lists[0]` only**. Returns `'added'` or `'already'`. Missing user storage recreates the default list. |
| `isInWatchlist` | True if the title is in **any** list. |
| `createList` | Appends a named list; the provider then selects it. Empty name → `null`. |
| `deleteList` | Removes that id. No “protected” default — the original Watchlist can be deleted. |
| `removeFromList` | Drops matching `mediaType` + numeric `id`. |

`WatchlistProvider` is keyed by `session.user?.id`. Logged-out users have `userId === undefined`, so the provider shows no lists.

### Watchlist overlay

Opened from the navbar (**My Watchlist** or the login icon does **not** open it — the icon logs out). Logged-out menu action opens `AuthModal` instead.

- Create list → `WatchlistModal` (name max **60**).
- List picker (`Select`) appears only when there are **2+** lists.
- Delete list: empty lists delete immediately; non-empty asks for a second click (`Delete “Name”?`). Blur cancels confirm.
- Empty list copy includes **Find a title**, which closes the overlay and scrolls to `#search`.
- Remove on a card calls `removeItem` and does not open detail (`children` sit beside the open button).

## Reviews API

Used by `DetailPage`, not the watchlist.

| Call | Path | Notes |
| --- | --- | --- |
| `getReviewsForMedia` | `GET /api/reviews` | Loads the whole list, then filters by `mediaType` + `mediaId`, newest `createdAt` first. |
| `createReview` | `POST /api/reviews` | Body always has `userId`, `mediaType`, numeric `mediaId`. `text` and `rating` are omitted when empty / `0`. |

## Examples

```js
// After login, add Dune (2021) to whichever list is currently first in storage
addToWatchlist(42, { id: 438631, mediaType: 'movie', title: 'Dune', imagePath: '/…', year: '2021' })

// Storage shape
{
  "42": [
    { "id": "watchlist", "name": "Watchlist", "items": [{ "id": 438631, "mediaType": "movie", "title": "Dune", "imagePath": "/…", "year": "2021" }] },
    { "id": "uuid-…", "name": "Sci-fi night", "items": [] }
  ]
}
```

Creating **Sci-fi night** does not change where **Add to Watchlist** writes — that button still uses index `0` (`Watchlist` in the example). Use the overlay to move or remove titles per list.

## Constraints

- No password-reset or “remember me” beyond the JWT in `localStorage`.
- Watchlists are not sent to Novi. Another browser / device starts empty.
- `isLoggedIn` is a leftover flag; `loadSession()` trusts the JWT, not that flag.
- If Novi omits a numeric user id, watchlist keys may be missing and **Add to Watchlist** bails out to the login modal (`user?.id == null`).
- Same-tab updates rely on `watchlists-changed`. Other tabs do not subscribe to `storage`.
- `WatchlistModal.css` still contains unused “choice list” rules from an earlier picker; the live dialog classes (`watchlist-modal__card`, actions, …) are largely unstyled in that file.
