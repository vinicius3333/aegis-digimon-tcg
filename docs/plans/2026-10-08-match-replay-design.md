# Portable participant replays

## User outcome

At the end of a real match, each seated player can download their own `.aegis-replay` file. From the player menu, open **Replays**, select that file, and review the match with play/pause, previous/next action, start/end, speeds 0.5×–4×, turn selection, the timeline, hand visibility, and board orientation. The history pane follows the selected action. Recorded cards can be inspected, but gameplay is disabled.

The user requested a new worktree and branch and individual file downloads. The implementation lives on `replay-files` in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/replay-files`. Questions about R2/profile storage were treated as architecture exploration; this feature does not require a database migration, account, bucket, or upload endpoint.

## Research and architecture

[Duelingbook research](../research/duelingbook-replay.md) establishes action-based playback using its existing duel renderer and an animation queue. Only its public replay HTML and shared JavaScript were inspectable; its server repository, storage format, and retention are unknown.

Aegis records immutable authoritative state frames and public events when a rules batch closes. Recording starts at `matchStarted` and ends with the completed game's final batch. Capturing closed batches preserves transitions that could otherwise disappear between network patch ticks. Playback uses recorded states rather than rerunning current card rules, and reuses `GameScreen` through its existing injected connection and presentation queue.

Seeking remounts presentation from the selected snapshot, cancelling stale animations. Autoplay supplies one closed batch with the original event batch identifier and waits for the presentation queue to finish before advancing. Prior snapshots support security and deletion scenes whose source permanent has already left the current board. The history pane owns the complete log; presentation receives only the current batch.

## Privacy and portability

The server exports two independent gzip JSON payloads on the `replay` channel. Each file contains only its participant's hand. Deck and egg-deck order, hidden security, private decisions, eligible hand counters, session identifiers, room codes, series room tokens, and the postgame full-zone reveal are omitted or redacted. Facedown public cards retain opaque instance identifiers and counts, with their identities removed. Opponent hand counts remain available. Spectators cannot obtain a participant file. Hiding the recorded hand is a local display preference; privacy is enforced before export.

The browser reads the chosen file locally, without uploading it or joining a gameplay websocket. The website still loads its normal card catalog and artwork. Files can be shared deliberately by their owner and reveal that owner's recorded hand.

Each file uses `format: aegis-replay`, format version 1, participant perspective, summary metadata, and frames containing elapsed time, state, and ordered events. This is a viewing artifact, not an authenticated match report or engine savegame. Replays cover one game per room, including games in a series. Development scenarios are excluded.

## Bounds and lifecycle

Recording is bounded to 5,000 frames and 32 MiB of expanded data, with metadata headroom. An over-limit match drops its recording and reports unavailable, rather than exporting an incomplete replay. Import bounds both file size and gzip expansion, validates the version, board structure, event payloads, frame ordering, participant hand permissions, and terminal state, and provides localized errors. A render boundary permits recovery from malformed or incompatible rendering.

Exports are cached per seat in the live room. Successful reconnects and a client's first completed-state observation can request redelivery; repeated requests are throttled. Download before leaving the result screen: room disposal removes the temporary export, while a downloaded file remains independent of the room. There is no durable server recovery or profile library in this scope. Card artwork and descriptive catalog data still reflect the installed client version.

## Validation

- API tests cover immutable frames, perspective-specific gzip files, hidden-zone and event redaction, complete-game delivery, spectators, departure, reconnect, and size limits.
- Browser file tests cover JSON/gzip import, invalid/unsupported/incomplete files, malformed narration, gzip expansion limits, seeking, hand hiding, and playback timing.
- Playwright covers a real match → download → local import, controls at 320×844, 768×1024, 1024×768, 1440×1000, and 844×390, autoplay/pause/restart, draw arrival followed by pointer inspection, security battle after attacker deletion, and no gameplay websocket during file viewing.
- Existing room lifecycle/series/timer/chat tests, shared build, API/web type checks, production builds, lint, formatting, and whitespace checks protect the integration.

Verified on 2026-10-08: 74 selected API tests, 105 selected client tests, and all 10 replay Playwright cases passed. Shared build, API/web type checks, API/web production builds, changed-file formatting, lint (two existing `useRoom` shadow warnings), and `git diff --check` passed. Local runtime was Node 24.21.0 with pnpm 10.30.1; the repository declares Node 26, so pnpm emitted its engine warning. Node 26 was not independently validated in this workspace.
