# Best-of-three format for casual and private matches

Players can choose Best of 1 or Best of 3 for Quick Match and Private Match.
Ranked, tournament, and bot rooms keep their current format. Tournaments
already run Bo3 through `tournaments/series`.

## Rules

| Topic | Rule |
| --- | --- |
| Win condition | First to 2 game wins |
| First player, game 1 | Seed parity, as today |
| First player, games 2–3 | The loser of the last game chooses. After 20 s with no choice, "go first" |
| Decks | Locked for the whole series |
| Surrender | Concedes the current game only |
| Leave series | Forfeits the rest of the series |
| Disconnect past grace | Forfeits the series |
| Not in next room within 60 s | Forfeits the series |
| Draw | Counts for no one. Another game is played, up to 5 games in total. After that, the series is a draw |
| Timer | Same options as Bo1, reset each game |

## UI

### Lobby

`MatchTimerSettings` becomes `MatchRulesSettings`, one "Match rules" group with
two rows:

- **Games per match:** a `Best of 1 | Best of 3` segmented control, with the hint "First
  to 2 wins. Loser of each game picks who goes first. Decks are locked for the
  series."
- **Match timer:** the existing switch, reserve line, and start select.

Quick Match and the private-room host see both rows. A private-room guest sees
the existing guest line, now "The host sets the format and timer for both
players." The choice is saved to localStorage (`aegis:match-format`) next to the
timer preference. The deck strip shows a "Best of 3" chip beside "Timer ON".

The row is labeled "Games per match", not "Format": the setup panel already
uses "Format" for the card pool ("Standard through BT1").

### In match

Each player already has their own clock beside their name, so the series score
sits in the opponent bar as a badge next to the opponent's clock: `G2 · 0–1`,
counted from the viewer's side. Phones drop the game number and show `0–1`. With
the timer off, the badge stands alone. A Bo1 match looks exactly like today.

### Between games

`GameOverOverlay` gets a `series` variant. It keeps the existing dark result
scrim rather than the navy dialog of the mockups, so Bo1 and Bo3 endings match:

1. Eyebrow `GAME 1 OF 3 · COMPLETE`, the game result, and its reason.
2. Score as text (`0 – 1`) and one pip per game, labeled W or L from the
   viewer's side. An unlabeled filled pip does not say who won, so never use one.
3. For the loser: "Go first" / "Go second" with a 20 s countdown bar. For the
   winner: "Nova is choosing…".
4. "View board" and "Leave series" (danger tone). "Find rematch" and "Main
   menu" are not shown until the series is over.

When the next room is ready, a short splash reads "Game 2 · Nova goes first"
while the client moves to the new room.

### Series end

The result dialog reads "Series won 2–1", with the per-game W/L pips. Actions:
"Find new match" (Quick Match) or "Back to room" (private), and "Main menu".
The design has no separate "rematch series" action.

Codex produced reference mockups during design. They are not checked in. Their
known flaws: the between-games mockup invents a board and a nav bar, and its pips
have no owner.

## Server

### One room still runs one game

`AegisRoom` keeps its invariant: it does not know which game of a series it
runs. It gets two generic additions:

- A `firstSeat` create option that overrides seed parity.
- A `series` schema field (`bestOf`, `gameNumber`, `wins0`, `wins1`) that the
  coordinator writes at create time. The room displays it and never reads it.

### Series store

`apps/api/src/rooms/series/` holds a series store kept in the slot's presence,
one hash per series. It follows the pattern of `cluster/roomCodes.ts`. The store
cannot be in-memory for two reasons:

- A slot runs three API processes. The next game's room can land on any of
  them.
- With no `AEGIS_REDIS_URL`, presence is local, so dev and tests work the same.

A series record holds `bestOf`, `wins`, the per-game results, each seat's locked
deck, the timer options, each seat's secret `seatToken`, the current `roomId`,
and the private and spectator codes.

The coordinator is a set of stateless functions over the store. Any process can
run them.

### Flow

1. The game 1 room is created with `bestOf: 3`. The coordinator opens a series
   and gives each client a `seatToken`.
2. On `gameOver`, the room publishes the result to the coordinator. This is the
   same hook that tournaments use in `recordAuthoritativeResult`. The coordinator
   updates the score. If the series is still open, it sends `seriesBetweenGames`
   through the old room. That room is locked but stays alive.
3. The loser sends `chooseTurnOrder`. The room forwards it on a generic series
   channel. After 20 s with no choice, the coordinator picks "go first".
4. The coordinator creates the next room with the locked decks, the timer, and
   `firstSeat`. It moves the private and spectator codes to that room, then sends
   `seriesNext { roomId }`.
5. Clients join by `roomId` with their `seatToken`, and the room seats each one
   by token. A seat with no client after 60 s forfeits the series.

Seats fill in order, because `state.players` must not have a gap. When the
seat-1 player arrives first, the room holds them until seat 0 arrives, then
seats both. A `ready` sent while held is buffered, since the client sends it
only once. Leaving while held forfeits the series.

### Forfeit reasons

`gameOver` today reports a disconnect as `surrender` (`matchLifecycle`
`handleDisconnect`). The result must tell the two apart, because a surrender
ends only the game and a disconnect ends the series.

### Deploys

A draining slot refuses new rooms (`canCreateRoom()` in `AegisRoom.ts`).
`canCreateRoom()` gets one exception: a create request whose `seriesId` is open
in this slot's presence. A slot can therefore drain up to about two games
longer. Cleanup already waits for zero rooms, so nothing else changes. Game 2 is
created from inside game 1's process, so it stays in the same slot.

### Matchmaking

Quick Match filters on both options: `filterBy(["matchTimer", "bestOf"])`.

## Client

- `packages/shared`: `MatchTimerOptions` becomes `MatchRulesOptions` and adds
  `bestOf: 1 | 3`.
- `net/client.ts` and `App.tsx` pass it the same way they pass the timer.
- `useRoom`: on `seriesNext`, leave the old room and join the new one with the
  `seatToken`. The splash covers the hop.

## Testing

- **Series store (unit, local presence):** scoring, draws and the 5-game cap,
  every forfeit path, and the 20 s default.
- **Room:** the `firstSeat` override, seating by token, a rejected unknown token,
  and the drain exception for open and closed series.
- **Integration:** two clients play a Bo3 to 2–1 across both room hops.
- **Matchmaking:** Bo1 and Bo3 queues never pair.
- **UI:** extend `tools/diagnostics/probe-match-result.mjs` to cover the series
  overlay at 320, 768, and 1440 px, plus reduced motion.
