# movies.map

React + Vite client for browsing movies, TV shows, and people through [TMDB](https://www.themoviedb.org/). The home screen is a full-viewport snap scroller: a typewriter intro, live search, and a guided Randomizer. Signed-in users can keep watchlists and write reviews through the Novi education API.

This README covers setup, architecture, and the pitfalls that are easy to hit locally. Search request behavior is documented in [docs/search.md](docs/search.md).

## In plain English

The app is three full-screen pages you scroll between, plus overlays:

1. **Home** types a short sentence, then shows the logo and **Get Started**.
2. **Search** asks TMDB for posters that match a title, year, or genre.
3. **Randomizer** walks through format, genre, and optional person filters, then suggests a title.

Sign in with a Novi account to save watchlists and publish reviews. Search needs a free TMDB **v3** API key in `.env.local`.

## Quick start

```bash
cd movies.map_v2
npm install
cp .env.example .env.local
# add your TMDB v3 API key and Novi project ID to .env.local
npm run dev
```

Vite listens on **port 5175** and will pick the next free port if 5175 is busy (`strictPort: false` in `vite.config.js`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (`**/*.{js,jsx}`) |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | Yes, for catalog data | TMDB **v3** key. Vite inlines `import.meta.env` at startup, so changing `.env.local` requires a restart. |
| `VITE_NOVI_PROJECT_ID` | Yes, for login/reviews | Sent as the `novi-education-project-id` header. |
| `VITE_NOVI_API_URL` | No | Hosted Novi API. Dev traffic is proxied through `/novi-api`. |

`.env.local` is gitignored via `*.local`. Do not commit a real key.

Without the TMDB key, `src/API/tmdb/client.js` throws:

> Missing TMDB API key. Add `VITE_TMDB_API_KEY` to `.env.local` and restart the dev server.

## Architecture

There is no router. `src/App.jsx` owns session and overlay history. Search, detail, and watchlist views are overlays, not routes. Overlay pages load with `React.lazy`.

```
App
├── NavBar                 theme, Novi auth, section menu, watchlist
├── main.snap-container    inert while an overlay is open
│   ├── #home              Typewriter intro
│   ├── #search            SearchSection (first TMDB page)
│   └── #randomizer        guided Randomizer
├── SearchResultsPage      overlay when “See all” is open
├── Watchlist              overlay when signed in
├── DetailPage             movie / TV / person
└── AuthModal              sign in / create account
```

| Concern | Where it lives |
| --- | --- |
| Theme + session | `src/hooks/useTheme.js`, `src/API/novi.js` |
| Overlay history | `src/hooks/useOverlayHistory.js` |
| Abort / delay helpers | `src/lib/async.js` |
| List helpers | `src/lib/list.js` |
| Smooth scroll | `src/lib/scroll.js` |
| TMDB HTTP | `src/API/tmdb/` (`client`, `search`, `details`, `watch`) |
| Genre lists | `src/hooks/useGenres.js` |
| First-page search UI | `src/pages/SearchSection.jsx` |
| Multi-page results overlay | `src/pages/SearchResultsPage.jsx` |
| Title / person detail | `src/pages/detail/` |
| Shared overlay / modal / chips | `src/components/` (`OverlayPage` owns the full-screen shell CSS) |
| Poster grids | `src/components/ResultGrid.css` (`.poster-grid`) |
| Pill fields | `.ui-field` on year, select, typeahead |

TMDB GETs share an LRU cache and coalesce in-flight requests in `src/API/tmdb/client.js`. Overlay unmounts abort waiting on the result; the network response can still fill the cache. Search and Randomizer cancel the previous in-flight request when a newer one starts.

Novi has no per-title review endpoint, so `getReviewsForMedia` loads `/api/reviews` once per session token, caches it, and filters in memory. Publishing a review updates that cache instead of downloading the whole list again.

### Snap layout

`.snap-container` uses `scroll-snap-type: y mandatory`. Each `.snap-section` is one viewport tall, with top padding for the fixed navbar (`--navbar-height: 3.5rem`). Menu items and the intro **Get Started** button scroll to `#home`, `#search`, or `#randomizer`. Press **/** from outside a field to jump to Search. **Escape** closes the topmost overlay, modal, menu, or episode accordion.

### Home intro (`Typewriter`)

`src/components/Typewriter.jsx` runs a one-shot script: type “Find any movie”, backspace to “show”, then “episode”, clear the line, then swap to the brand lockup. After ~1.3s it shows **Get Started**, which calls `scrollToSection('search')`.

- Unmount aborts the delays (`AbortController`), so leaving the page mid-animation does not update state.
- `prefers-reduced-motion: reduce` skips typing and CSS intro animations; the logo and CTA appear immediately.
- Dark theme inverts the logo images (`filter: invert(1)` in `Typewriter.css`).

### NavBar

Hamburger opens a full-viewport menu (`#main-menu`). **Escape** closes it. Section buttons call `onNavigate` (which closes overlays) then `scrollIntoView` on the next tick.

The **theme** icon always toggles light/dark. The **login** icon opens the Novi auth modal, or logs out. The menu’s **Log-in / Sign-up** item does the same when logged out; **My Watchlist** opens the watchlist overlay.

### Overlays and history

`useOverlayHistory` stores search / detail / watchlist in `history.state` so Back works:

- **See all** pushes `{ results: true }`.
- Opening a title stacks `{ detail }` on the current state.
- Watchlist stacks `{ watchlist: true }`.
- Navbar navigation pops every overlay entry (`history.go(-n)`), so Back cannot reopen a dismissed overlay.
- **Escape** on an overlay calls the same Back handler as the on-screen button. Open modals, the nav menu, and episode accordions sit higher on the Escape stack and close first.
- Stacked overlays stay mounted so Back can restore them instantly, but only the top one is active (`inert` / `aria-hidden` hide the rest from assistive tech and pointer events).

### Theme

Default is **dark**. `index.html` reads `localStorage.theme` before React mounts and sets both `data-theme` and `color-scheme` to avoid a flash. `useTheme` keeps `theme` in state, writes the same attributes on `<html>`, and persists `'light'` or `'dark'`. Tokens live in `src/App.css` under `html[data-theme='dark']` and `html[data-theme='light']`.

### Auth and watchlists

Novi JWT + profile are stored in `localStorage` (`noviToken`, `noviUser`). Watchlists are per user id in `localStorage.watchlists`. From a title page, **Add to Watchlist** saves to the default list, or asks which list when more than one exists.

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

`OverlayPage`, `Modal`, `ChipRow`, `ResultGrid`, `MediaImage`, `SearchStatus`, and `PersonTypeahead` wrap the repeated overlay, dialog, chip, poster-grid, search-status, and actor-search patterns. ResultGrid always applies `.poster-grid`, and year/select/typeahead share `.ui-field`. Poster `<img>` tags send a TMDB `srcset` so cards can pick `w185` / `w342` / `w500` from the same path.

## Constraints and known gaps

- Adult titles are always excluded (`include_adult=false`).
- The intro typewriter skips animation when `prefers-reduced-motion: reduce` is set.
- React Compiler is enabled (`babel-plugin-react-compiler` in `vite.config.js`). `AppShell` is marked `'use no memo'` so compiler memoization does not wrap that component.
- Novi reviews are fetched as a list, then filtered to the current title in the client.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Missing TMDB API key…` | No `VITE_TMDB_API_KEY`, or the dev server was not restarted after editing `.env.local`. |
| `Movie search failed. Check your API key…` | Wrong key type (v4 token instead of v3), revoked key, or TMDB HTTP error. |
| `Missing NOVI project ID…` | No `VITE_NOVI_PROJECT_ID` in `.env.local`. |
| Blank search after submit | Need a query, a 4-digit year, or a selected genre. |
| Year / Genre chips disabled | Type is **People**. `SearchSection` turns those filters off for `person`. |
| Dev URL is not `:5175` | Another process already bound 5175; Vite chose the next port. |
| Theme flash on reload | The inline script in `index.html` must stay in `<head>` so `data-theme` is set before paint. |
