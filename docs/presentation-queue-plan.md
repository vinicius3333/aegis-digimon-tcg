# Presentation queue plan

Goal: the server resolves at its own speed, the client narrates at its own
speed, and the player sees one moment at a time. This is what shipped mobile
card games do, and it removes the crowded-notice problem on phones at the root
instead of in CSS.

## Status

| Phase                | Shipped                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Stop the clipping | `.side-panel` no longer shrinks; the mobile column scrolls.                                                                                                                   |
| 1. Sequenced batches | `seq`/`batch`/`stateVersion` on every event, `batchClosed` after the patch, `GameState.stateVersion`, and a client inbox that groups by batch rather than by arrival time.    |
| 2. Narration track   | One `NarrationItem` per moment on one narration track, panel and notice of the same source folded together, compact on a portrait phone, and the screen caps retired.         |
| 3. Presented state   | Snapshot ring buffer and `selectPresentedState`; the board renders the batch the queue has reached while legality reads the live state; the decision barrier is a queue step. |
| 4. Polish            | Desktop skip button, haptic tap on a phone, in-memory presentation telemetry, and these docs.                                                                                 |

Residuals Phase 3 reported, still open on purpose:

- **Holds kept.** `heldSecurityCounts` stays. The presented snapshot lags by
  batch, and a security check removes the card and reveals it inside one batch,
  so only a per-scene hold can keep the shield's figure through the reveal.
- **Intra-batch fidelity.** The board moves one batch at a time, not one event
  at a time. Several moments inside one batch are read out over the same board,
  so a chain within a single batch is narrated in order but not staged step by
  step.
- **The barrier collapses only the batches behind the decision.** Batches older
  than the question lose their waits and their unread items (the match log keeps
  them). The batch that raised the question keeps its beats, because it is the
  question's own explanation.

## 1. The problem today

Symptom (portrait phone): a deleted-cards panel plus two effect notices open in
the same second. The single mobile column caps its height with
`overflow: hidden`, `.side-panel` has `overflow: hidden` so its flex
`min-height` is 0, the panel is squeezed and clipped, and the notices under it
read as painted over it (`apps/web/src/game/game.css:5319`).

Root causes, in order of importance:

1. **No explicit batch boundary.** `AegisRoom` broadcasts each `ServerEvent`
   the instant the engine emits it (`apps/api/src/rooms/AegisRoom.ts:308`).
   The client treats "events that arrived since the last render" as one batch
   (`fresh` in `useMatchCues.ts`). The boundary is therefore the Colyseus
   patch tick and React scheduling, not the rules.
2. **Board state runs ahead of narration.** Colyseus state patches apply on
   arrival. The client cannot delay them, so `useMatchCues` holds pieces back
   by hand: held security counts, held notices and panels, showcase holds,
   `PLAY_LEAD_IN_BUDGET_MS`. Every new cue needs a new hold.
3. **Notices and panels bypass the sequencer.** `animationQueue.ts` already
   runs steps per track with real awaits, `drain` and `replay` modes and a
   `skip()`. Notices and side panels are pushed straight into React state with
   their own timers (`openNotice`, `openPanels`, 15 call sites) and their own
   caps (`MAX_VISIBLE_NOTICES = 3`, `MAX_VISIBLE_SIDE_PANELS = 2` per side),
   so on a phone up to 7 blocks compete for one column.
4. **A notice carries the full clause.** Art, name and the printed text make a
   notice 3.75rem or taller. Peers show the trigger and the name, and leave the
   text to a tap or the log.

## 2. What shipped games do

Every reference below serializes. None of them shows two effect notices at once.

Primary and near-primary sources. Confidence notes mark claims a page did
not state outright.

- **Hearthstone game state protocol** (HearthSim,
  https://hearthsim.info/docs/gamestate-protocol/). The server sends a
  stream of already-resolved "power" packets (`FULL_ENTITY`, `TAG_CHANGE`,
  ...) grouped in `BLOCK_START`/`BLOCK_END` so the client can "ensure
  animations play in the correct order". The client animates a history; it
  does not resolve.
- **Fast Hearthstone log parsing** (HearthSim, 2016,
  https://hearthsim.info/blog/fast-hearthstone-log-parsing/). Blizzard logs
  two streams: `GameState` (what the server resolved) and `PowerTaskList`,
  which "logs the animation queue ... each game state delta block is logged
  as it happens on screen". This is the split we want: resolved state and
  presented state are different clocks.
- **Hearthstone queued animations** (Blizzard forums, 2022,
  https://us.forums.blizzard.com/en/hearthstone/t/opponents-queued-animations-skipped-my-turn-causing-me-to-lo/80057).
  Player evidence of the cost: a long deathrattle chain queued for 70 s while
  the server timer kept running. Clicking cards as they appear skips steps.
  Lesson: the queue needs a skip and the decision timer must account for it.
- **Bringing features to life in Legends of Runeterra** (Riot, 2019,
  https://www.riotgames.com/en/news/bringing-features-life-legends-runeterra).
  Presentation is event-driven and decoupled from logic: "the engineer
  doesn't know the animation's length or content, only that it should be
  triggered ... when a particular event occurs". Confidence: high for the
  split, the post does not cover skipping.
- **Marvel Snap fast-forward** (patch of 2023-01-10,
  https://www.mmobomb.com/news/marvel-snap-new-patch-adds-fast-forward-function-to-speed-up-crazy-long-card-loops-nerfs-galactus-others;
  dev recap https://outof.games/news/5246-marvel-snap-developer-discord-recap-8-ai-clairvoyance-variant-avatars-daredevil-interactions-more/).
  Cards reveal one by one in priority order; Second Dinner added an explicit
  fast-forward for trigger loops after players complained about length.
- **MTG Arena Full Control and auto-ordered triggers** (WotC, 2025,
  https://magic.wizards.com/en/news/mtg-arena/announcements-october-27-2025;
  settings list https://draftsim.com/mtg-arena-settings/). Arena
  auto-orders simultaneous triggers and auto-passes priority by default, with
  an opt-in to stop at every step. Its January 2021 mobile notes
  (https://magic.wizards.com/en/news/mtg-arena/mtg-arena-state-game-january-2021-01-21)
  cover clutter through layout only. Confidence: no WotC text on batching
  visuals was found.
- **Master Duel activation display** (YGOrganization, 2022,
  https://ygorganization.com/master-duel-november-11th-update/). An
  activated effect is shown in one slot at the top-right and the resolving
  chain link is highlighted. Confidence: the page shows one slot, it does not
  say "replaces".
- **Shadowverse: Worlds Beyond settings** (GameWith, 2026,
  https://gamewith.net/shadowverse-wb/68449). "Simple Card Effects" and
  per-category animation toggles. Confidence: settings only, no banner
  writeup found.
- **Networking of a turn-based game** (Longwelwind, 2022,
  https://longwelwind.net/blog/networking-turn-based-game/). Argues for
  sending actions or events rather than collapsed state deltas, because a
  delta such as "money rose by 30" destroys the intermediate steps a client
  would animate.
- **Event Queue** (Nystrom, Game Programming Patterns,
  https://gameprogrammingpatterns.com/event-queue.html). "You only need a
  queue when you want to decouple something in time." Ring-buffer
  implementation.
- **Colyseus state synchronization** (https://docs.colyseus.io/state,
  https://docs.colyseus.io/room). Two facts that shape section 3: "Only the
  latest mutation of each property is queued and sent to clients during the
  patchRate interval", so state alone cannot reproduce a chain; and
  `broadcast(type, msg, { afterNextPatch: true })` delivers a message only
  after the matching state has been applied.
- **Digimon Alysion closed beta survey** (Bandai Namco, 2025,
  https://www.digimon-alysion.com/en/survey-result/). Bandai's own app got
  the feedback "it was difficult to tell what effects were applied to me"
  and "lengthy, unskippable animations", and made the battle UI its top
  priority. DCGO's patch notes (https://dcgo.online/PatchNotes.html) log
  "UI not showing which effect is resolving when resolving 2 at one time".
  Neither reference client solved this; do not copy them here.

Not found, so not claimed: a Blizzard talk describing the task list, a Riot
post on skipping, a WotC post on visual batching, a source that Master Duel
replaces the previous banner.

Patterns to copy:

| Pattern                                                         | Who                                    | What it means for Aegis                                                                      |
| --------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| Server resolves fully, client replays a history at its own pace | Hearthstone (power history), Runeterra | Batch and sequence events; render the board from the snapshot the queue has reached          |
| One narration slot, newest replaces or queues                   | Master Duel, Shadowverse, Snap         | One "narration" track; a notice never stacks on a phone                                      |
| Trigger name and card, not the full clause                      | Snap, Runeterra, Hearthstone           | Compact notice by default; clause on tap or in the log                                       |
| Tap to advance, skip to fast-forward                            | Runeterra, Snap, MTG Arena             | The tap that already calls `skipAnimations()` also advances the narration                    |
| Prompt waits for the presentation to catch up, bounded          | Hearthstone, Runeterra                 | Keep `PLAY_LEAD_IN_BUDGET_MS` semantics, but as a queue barrier, not a wall clock            |
| Group cards moved by one effect into one event                  | Hearthstone                            | Keep `sidePanelMergeWindow`; merge the panel and the notice of the same moment into one item |

## 3. Target design

### 3.1 Server: sequenced, batched presentation stream

- Add to every `ServerEvent` an envelope: `seq` (monotonic per room),
  `batch` (id of the intent or decision answer that produced it), and
  `stateVersion` (the room's state revision after this event).
- Emit an explicit `batchClosed` event when the engine returns from
  `applyIntent` or from a decision answer (the hook `onActionSettled` already
  marks part of this boundary; extend it to every intent and decision).
- Add `stateVersion` to `GameState` (a schema field incremented with each
  broadcast patch), so the client can pair a patch with the last `seq` it
  contains.
- Broadcast `batchClosed` with `{ afterNextPatch: true }` (Colyseus room
  API), so the close always lands after the state the batch produced. The
  events inside the batch keep broadcasting immediately.
- Do not throttle the server to the client's animation speed; a slow phone
  must not slow the opponent.
- Reconnect: re-send the pending decision as today. The client rebuilds from
  the current state and replays nothing older than the last `stateVersion` it
  presented.

### 3.2 Client: one presentation queue, one presented state

- **Inbox.** `useRoom` stops slicing `events` to the last 100 and instead
  appends to an ordered inbox keyed by `seq`. Gaps are logged and resync
  from state.
- **Snapshots.** On every `onStateChange`, take a plain snapshot of the
  seat view (the board already reads through plain models in `boardModel.ts`)
  keyed by `stateVersion`. Keep a small ring buffer.
- **Presented state.** `GameScreen` renders from `presentedState`, the
  snapshot whose version matches the batch the queue is currently playing,
  not from the live state. When the queue is idle or in `replay` or `drain`,
  presented state equals live state. This retires the hand-rolled holds one
  by one (held security counts first, then held notices and panels, then
  showcase holds).
- **Batch as a step group.** `useMatchCues` turns each server batch into an
  ordered list of steps on the existing `animationQueue`, using the explicit
  `batch` id instead of `fresh`. Cut-ins, flights, bursts keep their tracks.
- **Narration track.** Notices and side panels become steps on one
  `narration` track. A step shows one item, awaits its reading time or a tap,
  and clears. The panel and the notice raised by the same source in the same
  batch (deleted cards + `[On Deletion]`) fold into one item.
- **Layout by device.** Portrait phone: the narration track shows one item,
  centred under the opponent bar, compact by default (trigger label, card
  name, art), clause on tap. Desktop and landscape: two corners, viewer left
  and opponent right, each showing the one item the queue has reached for
  that side, so a corner never stacks and never overlaps the panel column.
- **Advance and skip.** Tap on the item or the board advances the narration
  step. The existing `skipAnimations()` calls `queue.skip()`, which collapses
  the narration too. Auto-advance uses the current `TIMINGS` values.
- **Decision barrier.** When a decision arrives for the viewer, the queue
  fast-forwards to the batch that opened it, bounded by
  `PLAY_LEAD_IN_BUDGET_MS`, then presents the prompt. While an opponent's
  item is on screen the viewer's intents are held (board input lock), and a
  tap advances the item instead.
- **Log.** Every narration item is also a log line, so a skipped item is
  still readable.

## 4. Phases

Each phase ships on its own and is reversible.

### Phase 0: stop the clipping (1 change, ship now)

- `.side-panel { flex-shrink: 0 }`; the mobile column uses `overflow-y: auto`
  and `pointer-events: auto`.
- Tests: `game.mobile.test.ts` asserts no panel is shorter than its content.

### Phase 1: sequenced batches on the wire

- Shared: envelope fields on `ServerEvent`, new `batchClosed` kind.
- API: `AegisRoom` stamps `seq`/`batch`/`stateVersion`; `GameEngine` closes
  a batch after every intent and decision answer; `GameState.stateVersion`.
- Web: inbox by `seq`; `useMatchCues` groups by `batch` but keeps today's
  behaviour otherwise.
- Tests: `AegisRoom.test.ts` (ordering, one `batchClosed` per intent,
  reconnect), `useMatchCues.test.ts` (batching no longer depends on render
  timing).
- Bot and tournament replays are unaffected; they consume state, not events.

### Phase 2: narration track

- `notices.ts` and `sidePanels.ts` gain a shared `narrationItem` model; the
  15 `openNotice`/`openPanels` call sites enqueue steps instead of setting
  state.
- `NoticeStack` and `SidePanelStack` render what the track presents.
- Compact notice variant for portrait phone; clause on tap.
- Merge panel + notice of the same source and batch.
- Remove `MAX_VISIBLE_NOTICES`, `NOTICE_CROWDED_*`, `MAX_VISIBLE_SIDE_PANELS`
  as screen caps (they become queue policy: drop only on `skip`).
- Tests: `notices.test.ts`, `sidePanels.test.ts`, `NoticeStack.test.tsx`,
  `SidePanelStack.test.tsx`, `game.mobile.test.ts`.

### Phase 3: presented state

- Snapshot ring buffer in `useRoom`; `presentedState` selector.
- `GameScreen` reads `presentedState`; retire `heldSecurityCounts`, held
  notices/panels, and showcase holds one at a time, each with its test.
- Decision barrier as a queue step.
- Tests: `useMatchCues.test.ts` scenarios for battle + triggers, security
  check chains, DNA digivolve, reconnect mid-batch.

### Phase 4: polish

- Skip button on desktop; haptic tap on phone.
- Telemetry: queue depth and time-to-idle per batch, so we can tune
  `TIMINGS` from data.
- Update `docs/battle-animation-spec.md` cross-cutting note 2 and
  `docs/API-CONTRACT.md` section 5 (events now carry sequencing).

## 5. Risks and decisions

- **Snapshot cost on low-end phones.** A full plain snapshot per patch is
  cheap for a board of this size, but measure before Phase 3; fall back to
  snapshotting only zones the batch touched.
- **Long chains.** A 10-trigger chain becomes 10 narration steps. Shipped
  games accept this and give a skip. Auto-advance timers stay short (current
  `noticeCrowdedLifetime` is a good default), and a tap advances.
- **Spectators and replays.** They benefit for free; a replay is a batch
  stream with no decision barriers.
- **Out of scope.** No change to the rules engine's resolution order, no new
  event kinds beyond `batchClosed`, no change to bots.

## 6. Decisions

1. **Desktop keeps two corners.** The viewer's narration on the left, the
   opponent's on the right, as today. Both corners are fed by the same queue,
   one item per corner at a time. Portrait phone keeps the single centred
   slot.
2. **The opponent's narration blocks the viewer.** While an item from the
   opponent's batch is being presented, the viewer's own intents wait; a tap
   advances the narration rather than acting on the board. This matches the
   viewer's own play lead-in that already exists, and keeps the decision
   barrier symmetrical.
