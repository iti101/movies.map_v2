# TMDB search

How the Search section and “See all” overlay talk to TMDB. Implementation: `src/API/tmdb.js`, `src/pages/SearchSection.jsx`, `src/pages/SearchResultsPage.jsx`.

## In plain English

Type a title (or a 4-digit year) and press the search button. The app asks TMDB for **one page** of matches and shows posters. **See all** asks for more pages (up to 10) and fills the screen under the navbar. Year and genre are sometimes sent to TMDB and sometimes applied afterward in the browser, because not every TMDB URL accepts the same options.

A request runs only when the form has a trimmed query **or** a valid 4-digit year. Genre is an extra filter, not a trigger by itself. Changing chips after a search does **not** refetch — you have to press search (or Enter) again. Posters are not clickable.

## Intent

The search page shows **one TMDB page** (TMDB’s default 20 items, then local filters). **See all** re-fetches up to **10 pages** in parallel after page 1, applies the same filters, and renders them in a full-screen overlay that sits **under** the navbar.

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
| Empty query **and** a valid 4-digit year | `discoverTmdb` | `/3/discover/movie` and/or `/tv` (`sort_by=popularity.desc`) |

`SearchSection` never calls TMDB for genre-only submit. `fetchTmdbPage` *would* discover with only a genre if something else called it that way; the form does not.

Year-only submit is “popular titles from that year”, not a text search. Genre may ride along on discover as `with_genres`.

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

Chip changes are live in React state but **do not search**. The grid stays on the last submit until you press the search button or hit Enter in the query/year field. Chip `Button`s default to `type="button"`, so they never submit the form.

## Examples

**Title + year + genre (Movies)**

1. Type `Dune`, type chip **Movies**, Release date `2021`, Genre **Science Fiction**.
2. Submit → `GET /3/search/movie?query=Dune&year=2021&include_adult=false&page=1`.
3. `applySearchFilters` keeps rows whose `genreIds` include that genre’s TMDB id.
4. See all repeats that request for pages 1–10 (capped), then filters again.

**Year only (All)**

1. Clear the box, type **All**, Release date `1999`.
2. Submit → discover movie (`primary_release_year=1999`) **and** TV (`first_air_date_year=1999`), both `sort_by=popularity.desc`, same page number concatenated.
3. Client filter keeps items whose `year` is `'1999'` (needed because the two lists are merged).

**Incomplete year**

Typing `20` is not a valid year (`isValidYear` needs four digits). With an empty query that submit is treated as idle. With a query, search runs **without** a year param.

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

`App` owns overlay visibility and browser history (see the README). The overlay `z-index` is `5`; the navbar is `20`, so theme/login remain available.

Cards (`SearchCard`) render poster, title, and year only. There is no detail route or click handler.

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
- **Genre-only submit does nothing.** Need a query or `YYYY`. Changing Genre after a search also does nothing until you submit again.
- **Year-only is popularity browse.** Discover uses `sort_by=popularity.desc`, not relevance to a title.
- **All + year on page 1 can look sparse.** Year is applied after `/search/multi`, so many of the 20 hits may drop out. See all fetches more pages, then filters.
- **Query + genre has the same page-1 gap.** Genre is client-side on search endpoints, so See all is the path that searches deeper.
- **All + discover concatenates movie and TV pages** for the same page number (not a single mixed TMDB list). `totalPages` is `Math.max` of the two.
- **Genre list fetch failures fail closed.** `loadGenres` errors set `genres` to `[]` with no error banner.
- **Keys in the grid** are `` `${mediaType}-${id}` `` because the same TMDB id can exist as both a movie and a TV show.
- **See all after changing chips without resubmitting** can seed movie posters then refetch as TV (or with a new year/genre). Resubmit first if you want the overlay to match the grid.
