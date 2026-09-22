# TMDB search

How the Search section and “See all” overlay talk to TMDB. Implementation: `src/API/tmdb.js`, `src/pages/SearchSection.jsx`, `src/pages/SearchResultsPage.jsx`.

## In plain English

Type a title (or a 4-digit year) and press the search button. The app asks TMDB for **one page** of matches and shows posters. **See all** asks for more pages (up to 10) and covers the screen. Year and genre are sometimes sent to TMDB and sometimes applied afterward in the browser, because not every TMDB URL accepts the same options.

A request runs only when the form has a trimmed query **or** a valid 4-digit year. Genre is an extra filter, not a trigger by itself.

## Intent

The search page shows **one TMDB page** (20 items, then local filters). **See all** re-fetches up to **10 pages**, applies the same filters, and renders them in a full-screen overlay.

## Data flow

```
SearchSection.handleSubmit
  → fetchTmdbPage({ query, type, year, genre })   // page 1
  → applySearchFilters(...)                       // client-side year/genre when needed
  → SearchCard grid + “See all”

See all → App.openResults(search)
  → SearchResultsPage
  → searchTmdbAll(...)                            // pages 1..min(totalPages, 10)
  → applySearchFilters(...)
```

`fetchTmdbPage` chooses the TMDB family:

| Form state | Function | Endpoints |
| --- | --- | --- |
| Non-empty query | `searchTmdb` | `/3/search/multi`, `/movie`, `/tv`, or `/person` |
| Empty query, valid year (and/or genre) | `discoverTmdb` | `/3/discover/movie` and/or `/tv` |

Normalized item shape used by `SearchCard`:

```js
{ id, mediaType, title, year, imagePath, genreIds }
```

Posters use `https://image.tmdb.org/t/p/w185` plus `imagePath`. Missing images render a “No poster” placeholder. People use `profile_path` and have `year: null` and empty `genreIds`.

## Filters

Default type in the UI is **Movies** (`type: 'movie'`), not All.

| Chip | IDs | Notes |
| --- | --- | --- |
| All / Movies / TV / People | `all`, `movie`, `tv`, `person` | Changing type clears the selected genre. |
| Release date | 4-digit `YYYY` only (`isValidYear`) | Digits are stripped and capped at 4 characters. Turning the chip off clears the year. |
| Genre | TMDB `{ id, name }` | Loaded from `/3/genre/movie/list` or `/tv/list`. `all` uses the **movie** genre list. Turning the chip off clears the selection. |

**People** (`type === 'person'`) disables year and genre. `discoverTmdb` for `person` returns `{ items: [], totalPages: 0 }` — people only appear when there is a search query.

### Where year and genre are applied

TMDB does not accept the same params on every endpoint, so some filters are server-side and some are client-side.

| Filter | Query search | Discover (no query) | Client `applySearchFilters` |
| --- | --- | --- | --- |
| Year + `movie` | `year=` | `primary_release_year=` | — |
| Year + `tv` | `first_air_date_year=` | `first_air_date_year=` | — |
| Year + `all` | not sent (`/search/multi`) | sent on **both** movie and TV discover calls | keeps items whose `year` equals the filter |
| Genre + query | not sent | — | keeps items whose `genreIds` include the id |
| Genre + discover | — | `with_genres=` | still applied after fetch (no-op if TMDB already filtered) |

`/search/multi` has no year param, which is why **All + year** must filter locally.

## See all overlay

`handleSeeAll` builds the overlay payload from mixed state:

| Field | Source |
| --- | --- |
| `query` | Last **submitted** text (`searchedQuery`), not the live input |
| `type`, `year`, `genre` | **Live** chips (changing them without searching again can disagree with the seeded grid) |
| `results` | First-page list from the last successful submit |

`SearchResultsPage`:

1. Renders the seeded first page immediately when it is non-empty.
2. Always calls `searchTmdbAll` (max 10 pages, parallel after page 1).
3. Replaces the list with the full filtered set.
4. If the multi-page fetch fails **and** seeded results exist, it keeps the seed and does not show an error.

`App` owns overlay visibility and browser history (see the README).

## Status strings (SearchSection)

| Status | UI |
| --- | --- |
| `idle` | Empty results area |
| `loading` | “Searching…”; submit button disabled |
| `success` | Grid + See all |
| `empty` | “No results found for …” |
| `error` | `err.message` from `tmdb.js` |

Empty submit (no query and no valid year) resets to `idle` rather than erroring.

## Pitfalls

- **v3 key only.** Requests use `?api_key=`. A TMDB v4 bearer token will fail with “Movie search failed…”.
- **Restart after `.env.local` changes.** Vite bakes `VITE_*` at process start.
- **Genre-only submit does nothing.** Need a query or `YYYY`.
- **All + year on page 1 can look sparse.** Year is applied after `/search/multi`, so many of the 20 hits may drop out. See all fetches more pages, then filters.
- **Query + genre has the same page-1 gap.** Genre is client-side on search endpoints, so See all is the path that searches deeper.
- **All + discover concatenates movie and TV pages** for the same page number (not a single mixed TMDB list). `totalPages` is `Math.max` of the two.
- **Genre list fetch failures fail closed.** `loadGenres` errors set `genres` to `[]` with no error banner.
- **Keys in the grid** are `` `${mediaType}-${id}` `` because the same TMDB id can exist as both a movie and a TV show.
- **See all after changing chips without resubmitting** can seed movie posters then refetch as TV (or with a new year/genre). Resubmit first if you want the overlay to match the grid.
