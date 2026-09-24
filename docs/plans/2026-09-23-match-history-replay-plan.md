# Match history and replay

A player sees their past matches (opponent, decks, result, date, duration) and opens a replay that steps through the match from their own seat's view. Hidden information stays hidden. A replay link can be attached to a bug report.

## Decision

Record what each seat actually received, at record time. Do not rebuild matches from the seed and the intent log.

Recording gives three things:

- No hidden-information leak by construction, because it reuses the same `StateView` path.
- Replays stay valid across releases.
- The client reuses its existing snapshot and batch pipeline.

Keep the seed and intents in the log as a developer aid only.

## Why not re-simulate

The engine is only partly deterministic:

- Shuffles use a seeded mulberry32 generator split per seat (`engine/setup.ts:44-60`), and the bot's generator is seeded (`bot/rng.ts`).
- Some inputs are not intents and are never logged: the combat-window timer (`expireCombatWindow`, `AegisRoom.ts:1117`), the ready timeout (`:704`), disconnects and reconnects, and `seatPlayer` join options.
- There are fallback sources of nondeterminism: `Math.random` (`effects/verbs/securityStack.ts:17`) and `Date.now` (`effects/verbs/delayed.ts:67`).
- The engine is async and waits on decision promises, so a re-run needs the settle loops from `testkit/harness.ts:733-785`.
- Card modules change almost every release, so an old intent log diverges on newer code.

## Current state

- **Match rows:** only ranked and tournament matches are stored. The table allows only those modes (`db/migrations/001-initial-schema.ts:13`), and `recordMatch` runs only from those paths (`rooms/AegisRoom.ts:498-583`). Casual, private, bot and beta matches leave no row. With ranked off (`web/src/features.ts:5`), history is mostly tournament games.
- **Missing fields:** no start time, duration, `matchLogId` or seed. `AccountStore.profile` returns the last 50 matches with no deck per match (`accounts/AccountStore.ts:582`). Deck snapshots exist for ranked only (`:507`).
- **Match log:** JSONL on disk, kept 7 days (`localLogWriter.ts:8`), keyed by `matchLogId` (`AegisRoom.ts:383`, `logger.ts:14`). It records the seed (`:386`), the full unfiltered initial state (`:450`) and every intent with its result (`:1149-1165`). `tools/match-logs.mjs` greps it. It is not a queryable store.
- **Seat views:** Colyseus `StateView` plus `@view` tags (`engine/state/visibility.ts:309,336`, `gameEngine/matchLifecycle.ts:241`). Some batches go to one seat only (`batch.recipient`, `AegisRoom.ts:1068`). The client renders from plain per-batch snapshots (`web/src/net/presentedState.ts`, about 53 KB each) grouped by `serverBatches.ts`.
- **Bug reports:** `MatchLogId.tsx` only shows the id. The submit body has no match field (`bugs/routes.ts:98-106`), and `attachmentUrl` allows image hosts only.

## Design

### `ReplayRecorder` (`apps/api/src/replay/`)

- Keeps one shadow `StateView` per seat, updated through the existing `refreshStateView` and `exposeCardToView` calls.
- At each `closeBatch`, appends a frame per seat: `{batch, stateVersion, turn, activeSeat, events[] (seat-routed), stateDelta}`.
- Each frame's state is a JSON delta against the previous frame, with a full keyframe at each turn start.
- Buffers in memory, gzips, and flushes at `gameOver` next to `recordAuthoritativeResult`. A process crash loses the replay; accepted.

### Migration `match-replays`

- Widen the `match_records.mode` check to `casual | private | bot | beta`.
- Add `started_at`, `match_log_id`, `turns`.
- New table `match_replays(match_id FK, seat smallint, format_version int, app_revision text, frame_count int, byte_size int, data bytea, expires_at bigint, PK(match_id, seat))`, indexed on `expires_at`.
- Estimated 50–150 KB gzipped per seat per match.

### API (`accounts/routes.ts`)

| Endpoint                       | Behavior                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `GET /account/matches?cursor=` | Paginated: opponent, both deck names, own full deck, result, reason, date, duration, `hasReplay`. |
| `GET /matches/:id/replay`      | Participants only, and only their own seat's stream. Admins may pass `?seat=`.                    |
| Bug submit                     | New `replayMatchId` field, checked to belong to the reporter, linked in the GitHub issue.         |

### Web

- Routes `/history` and `/history/:matchId` (`routes.ts`, `SCREEN_PATHS`).
- `MatchHistory.tsx` and `ReplayViewer.tsx`. The viewer feeds frames into the board as a read-only presented state, with step, turn jump, play and pause, and a `?frame=` deep link.
- Bug dialog: "attach replay link".
- Strings in `en.ts` and `pt-BR.ts`.

### Full reveal

Not in v1 for players. The recorded streams are already filtered. A full-reveal view needs a third omniscient stream, for admins or bug triage only.

## Spike first

Can a shadow `StateView` be decoded into plain JSON on the server without clashing with the room's single `Encoder`? `visibility.test.ts` uses one encoder per state. Fallback: a redaction function, with a test that compares it against the Colyseus output.

The recorder must hook into `rebuildClientViews` and `exposeCardToClients` without adding per-patch cost.

## Commits

1. `feat(db)`: add match replay tables and widen match modes
2. `feat(api)`: record every finished match, not only ranked
3. `feat(api)`: capture per-seat replay frames in AegisRoom
4. `feat(api)`: persist replay at game over with retention sweep
5. `feat(api)`: add match history and replay endpoints
6. `feat(shared)`: add replay frame protocol types
7. `feat(web)`: add match history screen and route
8. `feat(web)`: add read-only replay viewer
9. `feat(bugs)`: attach replay link to bug reports
10. `docs`: describe replay format in API-CONTRACT

## Tests

- Migration test in the style of `008-bot-participants.test.ts`.
- `ReplayRecorder`: a seat's frames never contain the opponent's hand, deck or face-down security (follow `visibility.test.ts`). A single-recipient batch appears only in that seat's stream.
- `AegisRoom.test.ts`: a full bot match produces two replay rows.
- Route tests in the style of `routes.profile.test.ts`: a non-participant gets 403; the caller's own seat is enforced.
- `AccountStore.test.ts`: pagination and the retention sweep.
- Bug `routes.test.ts`: `replayMatchId` ownership.
- Web: `MatchHistory.test.tsx` and `ReplayViewer.test.tsx` cover stepping, turn jump and deep link; `routes.test.ts` covers the new paths.

## Open questions

1. Retention: 30 days, or the last N per account? Pin replays linked to bugs? Rough cost: 1,000 matches a day is about 200 MB a day.
2. Do guests get a history?
3. Show the opponent's decklist: never, fully, or only the cards revealed during the match?
4. Full reveal for players if both agree, or admin only?
5. Can non-participants open a replay link (for example bug triagers without admin rights)? That needs a signed link.
6. Once ranked is on, split history by mode?
