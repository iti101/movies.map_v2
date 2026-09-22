# Randomizer

Guided “surprise me” flow on the `#randomizer` snap page. Implementation: `src/pages/Randomizer.jsx`, `discoverTmdb` / `searchPeople` / `loadGenres` in `src/API/tmdb.js`.

## In plain English

Answer four optional questions (movies or TV, genres you want, genres to skip, an actor or director). The app then asks TMDB for popular titles that match, picks a **random page**, then a **random poster** on that page. You can flip to nearby titles from the same page or roll again.

Nothing is saved. Changing a filter dumps the current pick and sends you back to the wizard.

## Intent

Give a filtered discover result without typing a title. This is not a true shuffle of the whole catalog — TMDB discover is sorted `popularity.desc`, and only the first **20 pages** are eligible.

## Wizard

| Step | State | Skip? |
| --- | --- | --- |
| 1 Format | `type`: `movie` (default), `tv`, or `all` | No — Continue only |
| 2 Want | `wantGenres` (multi-select) | Yes (leave empty = any genre) |
| 3 Don't want | `avoidGenres` (multi-select) | Yes |
| 4 Who | one TMDB person, or none | Last step; **Surprise me** rolls |

Want and avoid are mutually exclusive: picking a genre on one step removes it from the other.

Genre chips come from `loadGenres(type)`. Switching Format reloads the list and drops want/avoid chips that are no longer in it. Type **all** merges movie + TV genre lists (same helper as Search).

### Person picker

- Type at least **2** characters.
- After **280ms**, `searchPeople` hits `/3/search/person` and shows up to **6** names.
- Clicking outside the field hides the list. A chosen person is sent as TMDB `with_people`.
- Failures look like “No people found.” — there is no separate error banner.

## Roll (`roll`)

```
discoverTmdb({ type, genres: wantGenres, excludeGenres: avoidGenres, personId })
  page 1  → lastPage = min(totalPages, 20)
  random page in 1..lastPage
  random index in that page’s items
```

TMDB mapping (see `discoverByMedia`):

| Filter | Query param | Join |
| --- | --- | --- |
| Want genres | `with_genres` | `\|` (OR — any selected genre) |
| Avoid genres | `without_genres` | `,` (exclude if the title has any of these) |
| Person | `with_people` | single id |
| Year | not used | Randomizer has no year step |

Type **all** fetches movie discover and TV discover in parallel and concatenates that page’s items (same as search discover).

The result card is a `MovieCard`; tap it to open `DetailPage` (`onSelect` from `App`).

**Previous / next** walk the **same page pool** in a loop. They do not fetch another page. **Surprise me again** calls `roll()` with the same filters (a new random page).

## Status

| `status` | UI |
| --- | --- |
| `idle` | Wizard; no pick yet |
| `loading` | Buttons say “Rolling…” |
| `success` | Poster + prev/next if `pool.length > 1` |
| `empty` | “Nothing matched. Loosen a filter and try again.” |
| `error` | `err.message` from `tmdb.js` |

Empty TMDB pages (filters too tight, or an empty random page) are `empty`, not `error`.

## Examples

- **Movies + Want: Comedy, skip the rest** → `/3/discover/movie?sort_by=popularity.desc&with_genres=35`.
- **Want Comedy and Science Fiction** → `with_genres=35|878` (either genre, not both required).
- **Avoid Horror** → `without_genres=27`.
- **Who: Tom Hanks** → `with_people=<id>` plus any genre params.

## Constraints

- Popularity-ranked, max page **20** (`MAX_RANDOM_PAGE`). Deep-catalog titles almost never appear.
- A random **page** can be empty even when page 1 had hits; the UI then says nothing matched.
- Type **all** can show a movie and a TV show with the same TMDB id; card keys are `` `${mediaType}-${id}` ``.
- The person filter is `with_people` (cast or crew). It is not limited to directors.
- Changing type / genres / person resets `phase` to `setup` and clears the pool, even if you were looking at a pick.
