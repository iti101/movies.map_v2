# movies.map

React + Vite client for browsing movies, TV shows, and people through [TMDB](https://www.themoviedb.org/). The home screen is a full-viewport snap scroller: a typewriter intro, a live search section, and a Randomizer placeholder.

This README covers setup, architecture, and the pitfalls that are easy to hit locally. Search request behavior is documented in [docs/search.md](docs/search.md).

## In plain English

The app is three full-screen pages you scroll between, plus a search overlay:

1. **Home** types a short sentence, then shows the logo and **Get Started**.
2. **Search** asks [TMDB](https://www.themoviedb.org/) (a public movie catalog) for posters that match a title or year.
3. **Randomizer** is an empty page for a later feature.

There is no login server. The person icon is a browser on/off switch. Search needs a free TMDB **v3** API key in `.env.local`.

## Quick start

```bash
cd movies.map_v2
npm install
cp .env.example .env.local
# add your TMDB v3 API key to .env.local
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
| `VITE_TMDB_API_KEY` | Yes, for search | TMDB **v3** key. Vite inlines `import.meta.env` at startup, so changing `.env.local` requires a restart. |

`.env.local` is gitignored via `*.local`. Do not commit a real key.

Without the key, `src/API/tmdb.js` throws:

> Missing TMDB API key. Add `VITE_TMDB_API_KEY` to `.env.local` and restart the dev server.

## Architecture

There is no router. `src/App.jsx` owns session-ish state and the three snap sections; the “See all” results view is an overlay, not a route.

```
App
├── NavBar              theme + localStorage auth stub + section menu
├── main.snap-container
│   ├── #home           Typewriter intro
│   ├── #search         SearchSection (first TMDB page)
│   └── #randomizer     placeholder copy only
└── SearchResultsPage   overlay when “See all” is open
```

| Concern | Where it lives |
| --- | --- |
| Theme + auth stub | `src/App.jsx`, applied to `<html data-theme>` |
| TMDB HTTP + filters | `src/API/tmdb.js` |
| First-page search UI | `src/pages/SearchSection.jsx` |
| Multi-page results overlay | `src/pages/SearchResultsPage.jsx` |
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

Hamburger opens a full-viewport menu (`#main-menu`). **Escape** closes it. Section buttons call `onNavigate` (which closes the results overlay) then `scrollIntoView` on the next tick.

The **theme** icon always toggles light/dark. The **login** icon always flips `isLoggedIn`. The menu’s **Log-in / Sign-up** item logs you in if you are logged out; **My Watchlist** (logged-in label) only closes the menu — there is no watchlist view.

### Results overlay and history

`openResults` stores the current search and `history.pushState({ results: true })`. Back / **Back** clears the overlay:

- If `history.state.results` is set, `closeResults` calls `history.back()`.
- A `popstate` listener always sets the overlay search to `null`.
- Navbar navigation also closes the overlay, then scrolls to the section (deferred one tick so the overlay unmounts first).

### Theme

Default is **dark**. `index.html` reads `localStorage.theme` before React mounts to avoid a flash. `App` keeps `theme` in state, writes `data-theme` and `color-scheme` on `<html>`, and persists `'light'` or `'dark'`. Tokens live in `src/App.css` under `html[data-theme='dark']` and `html[data-theme='light']`.

### Auth stub

`localStorage.isLoggedIn` is a boolean string (`'true'` / anything else). The navbar login icon toggles it. There is no backend, session cookie, or watchlist page — the menu label **My Watchlist** only appears when the stub is logged in.

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

## Constraints and known gaps

- **Randomizer** (`#randomizer`) is still placeholder text.
- **Login / watchlist** are UI-only; nothing is stored except the `isLoggedIn` flag.
- Adult titles are always excluded (`include_adult=false`).
- The intro typewriter skips animation when `prefers-reduced-motion: reduce` is set.
- React Compiler is enabled (`babel-plugin-react-compiler` in `vite.config.js`). `App` is marked `'use no memo'` so compiler memoization does not wrap that component.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Missing TMDB API key…` | No `VITE_TMDB_API_KEY`, or the dev server was not restarted after editing `.env.local`. |
| `Movie search failed. Check your API key…` | Wrong key type (v4 token instead of v3), revoked key, or TMDB HTTP error. |
| Blank search after submit with only Genre on | Submit requires a non-empty query **or** a 4-digit year. Genre alone does not start a request. |
| Year / Genre chips disabled | Type is **People**. `SearchSection` turns those filters off for `person`. |
| Dev URL is not `:5175` | Another process already bound 5175; Vite chose the next port. |
| Theme flash on reload | The inline script in `index.html` must stay in `<head>` so `data-theme` is set before paint. |
