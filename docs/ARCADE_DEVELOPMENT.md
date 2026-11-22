# Biling Arcade

The web hub is `/games`. The native Games tab uses the same catalog in Expo. Today's Mot, Links and Recall puzzles sit above the legacy quiz collection. The native boards are React Native components and the web boards use DOM controls.

## Local setup

Generate Prisma and apply migrations to local PostgreSQL. From `apps/api`, use `npx.cmd pnpm@10 exec tsx prisma/seed-arcade.ts` to add three sample puzzles for the current UTC day. An optional `YYYY-MM-DD` argument schedules a different day. The seed checks for a local database and preserves already-scheduled entries. Refresh the web hub or pull down in the native Games tab.

The migrations are `20261122140000_arcade` and `20261122145000_daily_quiz_progress`. Review deployment separately before applying changes to hosted data.

## Rules and state

- **Mot** checks guesses against bundled English and French dictionaries on the API server. The same puzzle accepts both languages. Enter Tunisian Latin spellings under **Extra accepted words** in Studio, one per line. French accents fold to the base letter, and œ and æ occupy two tiles as OE and AE. The solution is always accepted and invalid guesses do not use a turn. [English word list](https://github.com/sindresorhus/word-list) · [French word list](https://github.com/words/an-array-of-french-words)
- **Links** validates four distinct, currently available tiles per move. The server derives opaque public tile IDs, locks solved groups and consumes a mistake for each incorrect group.
- **Recall** compares exact normalized answers and curated aliases. It normalizes Unicode and whitespace, ignores case, and can fold Latin accents. Arabic-script and transliterated aliases are authored per answer. Answers are checked on Enter or Submit.
- **Legacy quizzes** store selections by stable question ID. Casual selections live in the player until reload or exit. Signed-in official daily selections are saved one at a time, restored from the server, and validated again at submission. A legacy Studio edit that changes question IDs invalidates in-flight selections for that version. The official UTC completion constraint still applies.

The day resets at **00:00 UTC**. One run per puzzle and account is enforced in PostgreSQL. A run starts in progress and ends completed or expired. Recall's deadline is the earlier of its configured duration and midnight UTC. Mot and Links use midnight UTC. There is no automatic puzzle generation. The hub surfaces the published puzzles scheduled for that day.

Moves carry the last observed revision. The database only applies a move if the revision still matches and the deadline is in the future. Duplicate and stale requests return the latest authoritative view. Reload or open the same dated puzzle on another signed-in device to recover progress. The clock is estimated from the server's time and deadline. The server enforces expiration regardless of the displayed timer.

## API and access

All paths use the `/api/v1` prefix.

| Method    | Route                       | Purpose                                                 |
| --------- | --------------------------- | ------------------------------------------------------- |
| GET       | `/arcade`                   | Today's catalog and signed-in completion status         |
| GET       | `/arcade/:slug/:date`       | Public puzzle and the caller's saved run                |
| POST      | `/arcade/:slug/:date/start` | Idempotent account-based start or resume                |
| POST      | `/arcade/:slug/:date/moves` | Validate and persist a move, or reconcile expiration    |
| GET, PUT  | `/games/:slug/progress`     | Read official daily quiz progress or save one selection |
| GET, POST | `/admin/arcade`             | Staff list and save scheduled puzzles                   |

Web server actions attach the existing audience token from its HttpOnly session cookie. Native uses the same API with its SecureStore-backed bearer. The server rate-limits writes and scopes lookup to the authenticated audience ID.

The shared schemas cover definitions, actions and public views. The NestJS rules module is authoritative. Puzzle data stays in PostgreSQL and local seed files. Public responses exclude unfinished solutions, undiscovered groups and undiscovered answers. The web client receives only the public response. Staff routes are independently guarded.

## Studio and remaining work

Open **Admin Studio → Arcade** to edit a draft using the format-specific fields and choose its UTC date. Publishing locks that definition. Use a new date for subsequent editions. The existing Games editor still handles trivia and personality content. Public puzzle previews are available once scheduled puzzles are live. Interactive staff-only draft previews, arcade artwork uploads and difficulty metadata are future work.

The arcade puzzles require sign-in for play. Existing trivia and personality quizzes and daily practice remain available to guests. Offline scoring, audio, haptics, additional Mot language packs and account-wide historical arcade statistics are future work.

## Verification

Run the existing workspace checks sequentially if disk space is limited. Check web keyboard controls and native touch and small-screen layouts. Sign in on each platform with the same account, start Recall on one, submit an answer, resume on the other, and confirm the same deadline and unlocked slots. Also test simultaneous submissions, time expiration, and the saved legacy daily quiz selections. Do not count a platform bundle export as execution on a device.
