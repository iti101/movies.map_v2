# Title and person pages

Full-screen overlay for one TMDB movie, TV show, or person. Implementation: `src/pages/DetailPage.jsx`, loaders in `src/API/tmdb.js`, reviews in `src/API/novi.js`.

## In plain English

Tap a poster. The app asks TMDB for that title’s story, cast, trailer, streaming options, and similar titles. TV shows also list episodes. If you are logged in you can save the title to a local watchlist and post a star rating / short review to Novi.

**Back** (or the browser back button) closes the page. Opening another title from Cast / Similar pushes another history entry.

## Intent

One overlay, three shapes. `App` stores `{ mediaType, id }` and remounts the page with `key={`${mediaType}-${id}`}` so a nested open starts clean.

| `mediaType` | Loader | Sections |
| --- | --- | --- |
| `movie` | `getMovieDetails` | Header, story, cast, where to watch, reviews, similar (max 8) |
| `tv` | `getTvDetails` | Same, plus episodes and a **Created by** header fact; similar uses a longer row titled “Similar titles” (max 12) |
| `person` | `getPersonDetails` | Photo, bio, known-for (max 10). No watchlist, trailer, or reviews. |

Unknown `mediaType` shows “Unknown title type.” Failed TMDB detail calls use `tmdbGet` copy — **Could not load this page. Try again.** — not the search error.

## Data loaders

Each title request uses TMDB `append_to_response` so one HTTP call covers credits, videos, watch providers, recommendations, and similar.

Normalized extras:

| Field | Rule |
| --- | --- |
| Trailer | First official YouTube Trailer, else any official Trailer, else Trailer, else Teaser, else first clip. YouTube / Vimeo only. |
| Cast | First **12**. TV prefers `aggregate_credits`. On TV pages, directors (max **6**) are **prepended** onto this same row — there is no separate Directors block. |
| Directors (movie) | Names only, in the header facts (`Director` / `Directors`). |
| Similar | Recommendations first, then similar; skip the current id. |
| Score | `vote_average` rounded to 1 decimal; hidden as “Not rated yet” when 0. |
| Person known-for | Cast credits only; skip TV with fewer than **4** episodes; sort by TMDB popularity. |

`getTvSeason(showId, seasonNumber)` loads episode name, air date, runtime, and overview. Seasons with `episode_count === 0` are omitted. The dropdown defaults to season ≥ 1 when that exists (so “Specials” is not first).

## Where to watch

TMDB watch providers are grouped by country and offer type: Stream, Free, Free with ads, Rent, Buy. The same provider can list several offers.

Region:

1. `localStorage.watchRegion` if it is a 2-letter code.
2. Else the region suffix of `navigator.language` (for example `en-GB` → `GB`).
3. Else `US`.

`getWatchRegions()` caches `/3/watch/providers/regions`. On failure it uses a hardcoded fallback list (US, GB, NL, …).

Provider taps go to a **search URL** on that service (`providerWatchUrl`), not a deep link to the title. Unknown providers fall back to TMDB’s `link` for that country (often a JustWatch page).

## Reviews

`Reviews` loads `GET /api/reviews` (Novi) even when you are logged out (`token` may be `null`) and **filters in the browser** to this `mediaType` + `mediaId`. A failed fetch and an empty list both show “No reviews yet.”

**Write a review** opens login if you have no session. Publish requires a star rating **or** non-empty text (max **2000** characters).

`StarRating` is 0.5–5. Hover/click the **left** half of a star for `N − 0.5`, the **right** half for `N`. Published reviews pass `interactive={false}` so they are display-only. Authors: your review can show `user.username`; everyone else is **Member**.

## Watchlist button

Logged out → opens `AuthModal`. Logged in → `addToWatchlist(user.id, item)` (see [auth-and-watchlists.md](auth-and-watchlists.md)). The button does not use `WatchlistContext`, so removing a title in the Watchlist overlay will not update this label until the detail page re-renders.

## Navigation example

1. Search “Dune” → tap the 2021 movie card.
2. `App.openDetail({ mediaType: 'movie', id: 438631 })` and `pushState({ detail: { mediaType, id } })`.
3. Cast tap (Timothée Chalamet) pushes another `detail` on top of the current history state.
4. Back returns to Dune; Back again closes the overlay.

## Constraints

- Overlay `z-index: 6` (above See all / Watchlist at 5; below the navbar at 20).
- Opening detail from See all keeps `history.state.results`, so Back returns to results.
- Person pages have no “Add to Watchlist”.
- Watch-provider links are search pages; availability text is “for {country}” and can be stale vs. the live service.
- Episode **Escape** only closes an open synopsis, not the whole detail overlay.
