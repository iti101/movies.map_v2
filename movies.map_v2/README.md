# movies.map

React + Vite client for browsing movies, TV shows, and people through [TMDB](https://www.themoviedb.org/). The home screen is a full-viewport snap scroller: a typewriter intro, live search, and a guided Randomizer. Login uses the Novi student backend; watchlists stay in the browser.

This README covers setup, architecture, and the pitfalls that are easy to hit locally.

| Topic | Doc |
| --- | --- |
| Search, filters, See all, Did you mean | [docs/search.md](docs/search.md) |
| Guided Randomizer | [docs/randomizer.md](docs/randomizer.md) |
| Title / person detail, trailers, watch providers, reviews | [docs/detail.md](docs/detail.md) |
| Novi login, reviews API, local watchlists | [docs/auth-and-watchlists.md](docs/auth-and-watchlists.md) |

## In plain English

The app is three full-screen pages you scroll between, plus overlay screens:

1. **Home** types a short sentence, then shows the logo and **Get Started**.
2. **Search** asks TMDB (a public movie catalog) for posters. Tapping a poster opens a detail page.
3. **Randomizer** asks a few optional filters, then picks a random popular title.

**Log in** creates a real Novi account (reviews live on that server). **Watchlists** are saved only in this browser, keyed by your Novi user id. Search and the Randomizer need a free TMDB **v3** API key in `.env.local`. Login also needs a Novi project id.

## Quick start

```bash
cd movies.map_v2
npm install
cp .env.example .env.local
# add VITE_TMDB_API_KEY and VITE_NOVI_PROJECT_ID
npm run dev
```

Vite listens on **port 5175** and will pick the next free port if 5175 is busy (`strictPort: false` in `vite.config.js`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR. `/novi-api` is proxied to Novi. |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (`**/*.{js,jsx}`) |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | Yes, for search / randomizer / details | TMDB **v3** key (`api_key` query param). |
| `VITE_NOVI_PROJECT_ID` | Yes, for login / reviews | Sent as header `novi-education-project-id`. |
| `VITE_NOVI_API_URL` | Production only | Defaults to the hosted Novi API. Dev ignores this and uses the Vite proxy. |

Vite inlines `import.meta.env` at startup, so changing `.env.local` requires a restart. `.env.local` is gitignored via `*.local`. Do not commit real keys.

Without the TMDB key, `src/API/tmdb.js` throws:

> Missing TMDB API key. Add `VITE_TMDB_API_KEY` to `.env.local` and restart the dev server.

Without the Novi project id, submitting the login form throws:

> Missing NOVI project ID. Add `VITE_NOVI_PROJECT_ID` to `.env.local` and restart the dev server.

## Architecture

There is no React Router. `src/App.jsx` owns session, theme, and overlay flags. Search results, a title/person page, and the watchlist are full-screen overlays on top of the snap scroller.

```
App
├── WatchlistProvider     localStorage lists for the logged-in user id
├── NavBar                theme, login/logout, section menu, My Watchlist
├── main.snap-container
│   ├── #home             Typewriter intro
│   ├── #search           SearchSection (first TMDB page)
│   └── #randomizer       guided discover + random pick
├── SearchResultsPage     overlay when “See all” is open
├── Watchlist             overlay when logged in and “My Watchlist” is open
├── DetailPage            overlay for a movie, TV show, or person
└── AuthModal             sign-in / create-account dialog
```

| Concern | Where it lives |
| --- | --- |
| Theme | `src/App.jsx`, applied to `<html data-theme>` |
| Novi session + reviews HTTP | `src/API/novi.js` |
| TMDB HTTP + filters | `src/API/tmdb.js` |
| Local watchlists | `src/API/watchlist.js`, `src/context/WatchlistContext.jsx` |
| First-page search UI | `src/pages/SearchSection.jsx` |
| Multi-page results overlay | `src/pages/SearchResultsPage.jsx` |
| Title / person page | `src/pages/DetailPage.jsx` |
| Guided random pick | `src/pages/Randomizer.jsx` |
| Poster tile | `src/components/MovieCard.jsx` |
| Shared buttons | `src/components/Button.jsx` |
| Smooth scroll helper | `src/scrollToSection.js` |

### Snap layout

`.snap-container` uses `scroll-snap-type: y mandatory`. Each `.snap-section` is one viewport tall, with top padding for the fixed navbar (`--navbar-height: 3.5rem`). Menu items and the intro **Get Started** button scroll to `#home`, `#search`, or `#randomizer`.

### Home intro (`Typewriter`)

`src/components/Typewriter.jsx` runs a one-shot script: type “Find any movie”, backspace to “show”, then “episode”, clear the line, then swap to the brand lockup. After ~1.3s it shows **Get Started**, which calls `scrollToSection('search')`.

- Unmount aborts the delays (`AbortController`), so leaving the page mid-animation does not update state.
- `prefers-reduced-motion: reduce` skips typing and CSS intro animations; the logo and CTA appear immediately.
- Dark theme inverts the logo images (`filter: invert(1)` in `Typewriter.css`).

### NavBar

Hamburger opens a full-viewport menu (`#main-menu`). **Escape** closes it. Section buttons call `onNavigate` (which dismisses overlays) then `scrollIntoView` on the next tick.

The **theme** icon always toggles light/dark. The **login** icon opens `AuthModal` when logged out, or logs out (clears the Novi session and closes the watchlist) when logged in. The menu’s **Log-in / Sign-up** item does the same as the icon when logged out; **My Watchlist** opens the watchlist overlay (or the auth modal if you are logged out).

### Overlays and history

Still no router. Overlays are `history.pushState` flags so **Back** works:

| Overlay | History flag | z-index | Closed by |
| --- | --- | --- | --- |
| See all results | `{ results: true }` | 5 | Back, navbar navigation |
| Watchlist | `{ …state, watchlist: true }` | 5 | Back, logout, navbar navigation |
| Detail | `{ …state, detail: { mediaType, id } }` | 6 | Back, navbar navigation |
| Auth modal | none (React state only) | 40 | Escape, overlay click, success |

`openResults` replaces history state with `{ results: true }` (it does not copy earlier flags). `openDetail` and `openWatchlist` spread the current state, so you can open a title from See all or from the watchlist and go **Back** to that overlay.

`popstate` restores `detail` and `watchlist` from `history.state`. The results overlay is only cleared when `state.results` is missing — it is not rebuilt from history, so a full reload drops an open See all view.

Navbar section links call `dismissOverlays`, which hides every overlay and `replaceState({}, '')`.

### Theme

Default is **dark**. `index.html` reads `localStorage.theme` before React mounts to avoid a flash. `App` keeps `theme` in state, writes `data-theme` and `color-scheme` on `<html>`, and persists `'light'` or `'dark'`. Tokens live in `src/App.css` under `html[data-theme='dark']` and `html[data-theme='light']`.

### Stacking

The navbar stays above the page overlays (you can still toggle theme or log out on a detail page). Auth sits on top of everything.

| Layer | z-index |
| --- | --- |
| Navbar | 20 |
| Hamburger menu | 10 |
| Detail | 6 |
| See all / Watchlist | 5 |
| Auth modal | 40 |

## UI primitives

`Button` is the shared control for chips, icon buttons, and ghost links.

| Prop | Default | Behavior |
| --- | --- | --- |
| `variant` | `'chip'` | `chip`, `ghost`, `solid`, `icon` |
| `size` | `'md'` | `sm`, `md`, `lg`, `xl`. Any other string is treated as a raw CSS font-size via `--button-size`. |
| `active` | `false` | Adds `is-active` and `aria-pressed` (used by search chips). |
| `round` | `false` | Circular (search submit). |
| `color`, `background`, `hoverBackground` | — | CSS color, or a token name that becomes `var(--color-<name>)`. |
| `font` | `'body'` | `'body'` → `--font-body`, `'display'` → `--font-display`. |
| `text` | — | Fallback label if there are no `children`. |
| `weight`, `fontSize` | — | Inline `font-weight` / `font-size`. |

```jsx
<Button
  variant="icon"
  round
  background="accent-btn"
  hoverBackground="accent-btn-hover"
  aria-label="Search"
>
  <img src={searchIcon} alt="" />
</Button>
```

`MovieCard` is the clickable poster used by search, See all, Randomizer, watchlist, and “similar / known for” rows. It calls `onSelect(item)` with `{ id, mediaType, title, … }`. Optional `children` overlay the tile (watchlist remove button).

## Constraints and known gaps

- Adult titles are always excluded (`include_adult=false`).
- Watchlists are **localStorage only** (`watchlists`). They are not synced to Novi. Clearing site data wipes lists.
- **Add to Watchlist** on a detail page always writes to the **first** stored list, even if another list is selected in the Watchlist overlay.
- Reviews require a logged-in Novi session. Other users’ names render as **Member**; your own review can show your username.
- The intro typewriter skips animation when `prefers-reduced-motion: reduce` is set.
- React Compiler is enabled (`babel-plugin-react-compiler` in `vite.config.js`). `App` is marked `'use no memo'` so compiler memoization does not wrap that component.
- Production builds inline `VITE_*`. A wrong key in the built `dist/` means rebuild, not just restart.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Missing TMDB API key…` | No `VITE_TMDB_API_KEY`, or the dev server was not restarted after editing `.env.local`. |
| `Movie search failed. Check your API key…` | Wrong key type (v4 token instead of v3), revoked key, or TMDB HTTP error. |
| `Missing NOVI project ID…` | No `VITE_NOVI_PROJECT_ID`, or no restart after adding it. |
| `Invalid email or password.` | Novi 401. Check the account, or create one from the modal. |
| Login works in `npm run dev` but fails in `preview` | Production calls `VITE_NOVI_API_URL` (or the default host) directly — CORS / URL must be reachable without the Vite proxy. |
| Blank search after submit with only Genre on | Submit requires a non-empty query **or** a 4-digit year. Genre alone does not start a request. |
| Year / Genre chips disabled | Type is **People**. `SearchSection` turns those filters off for `person`. |
| Dev URL is not `:5175` | Another process already bound 5175; Vite chose the next port. |
| Theme flash on reload | The inline script in `index.html` must stay in `<head>` so `data-theme` is set before paint. |
| Watchlist empty after login | Lists are keyed by Novi `user.id`. A different account (or missing id) is a different bucket. |
