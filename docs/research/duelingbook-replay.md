# Duelingbook replay research

Researched on 2026-10-08 for an Aegis replay implementation. Existing research notes use English Markdown under `docs/`; this task places its single note in `docs/research/`. This is an independent design informed by public client behavior, without copying the vendor implementation.

## Primary sources and method

- [Official replay page](https://www.duelingbook.com/replay): downloaded HTML and inspected its inline JavaScript, including `loadReplay`, `loadReplayComplete`, `timerE`, `duelResponse0`, `playE`, `pauseE`, `nextE`, `fastE`, `saveGamestate`, and `stepBackwardE`.
- [Shared duel client, version 932](https://static.duelingbook.com/duel.js?v=932): downloaded publicly served JavaScript and inspected `duelResponse`, `performNextAction`, and `endAction`. The delivered bundle is minified and obfuscated; this is public client code, not access to a server repository.
- [Shared utilities, version 932](https://static.duelingbook.com/utils.js?v=932): referenced by the replay HTML; not relied on for unverified storage claims.

Reproduce the source inspection with ordinary unauthenticated downloads:

```sh
curl -L 'https://www.duelingbook.com/replay' -o /tmp/duelingbook-replay.html
curl -L 'https://static.duelingbook.com/duel.js?v=932' -o /tmp/duelingbook-duel.js
rg -n 'loadReplay|timerE|nextE|fastE|saveGamestate|stepBackwardE' /tmp/duelingbook-replay.html
```

These commands retrieve public assets only. No login, private endpoint access, or challenge bypass was used. Files can change; function names and versioned URLs identify the inspected code.

## Findings

The replay page requests JSON using POST `view-replay?id=...`, with Turnstile validation. Its loader expects player metadata, `version`, `plays`, and `logs`. Playback consumes timed records through `duelResponse0`, which normalizes historical actions and calls `duelResponse`. This is recorded action playback, rather than video. [Source: replay HTML](https://www.duelingbook.com/replay).

Visible controls are Play, Pause, Next Play, Fast Forward, and hand visibility modes. Normal playback ticks every 500 ms; fast playback uses 150 ms and skips waiting between plays. Next Play waits for active animations. Game/match query parameters and transition markers support game selection. Logs accompany the board. A Step Backward input is commented out, although snapshot and rewind handlers exist; shipped rewind must not be assumed. [Source: replay HTML](https://www.duelingbook.com/replay).

Replay metadata is loaded from the server using a stable duel identifier, optionally prefixed with a user identifier. The hand visibility preference uses localStorage. Client conditions consider `master`, replay version, and `conceal`; these conditions do not establish server access guarantees. [Source: replay HTML](https://www.duelingbook.com/replay).

The shared duel client dispatches plays by type, resolves the relevant player, and queues presentation actions. `performNextAction` gates the queue; `endAction` removes a completed action, updates counters, invokes `saveGamestate`, and advances the queue. The shared `saveGamestate` is a no-op hook that the replay page overrides. This explains how replay reuses live board rendering while keeping playback timing separate. [Source: shared duel client](https://static.duelingbook.com/duel.js?v=932).

## Limits

The server implementation, database schema, retention period, storage compression, recording write path, and actual replay JSON response were not available in this investigation. The payload endpoint requires Turnstile; it was not called without a valid challenge response. Payload fields above are expectations visible in the loader, not a captured response. Durable server recording is an inference from the fetch-by-ID architecture, not a verified account of its persistence internals.

The hidden rewind code is evidence of an implementation attempt. Its presence does not demonstrate correct behavior across game boundaries, older versions, or all action types. Publicly delivered code also includes compatibility repairs and state-specific queue guards; feature parity should target the user experience, not reproduce those implementation details.

## Independent Aegis design implications

These are engineering recommendations for Aegis, not claims about Duelingbook:

1. Record an ordered, versioned sequence during authoritative server transitions, including the initial state and final outcome. Keep timestamps and action labels so the board and log share one position.
2. For the requested Aegis scope, export a separate gzip JSON file for each participant at game completion and open it locally from `/replays`. Keep a stable recording identifier inside the file. It must remain usable after the live room has been removed; server persistence and profile history are future work.
3. Reuse the Aegis match board in read-only mode. Disable action sends and live websocket subscriptions. Controls should support pause/resume, next/previous action, playback speed, a position slider, and turn navigation.
4. Prefer recorded authoritative board frames or checkpoints over rerunning a match against today's engine. Otherwise card fixes, random outcomes, and engine changes can alter historical playback. Snapshot seeking also makes reliable backward navigation straightforward.
5. Project recorded states on the server for the permitted perspective. A hand visibility selector must never be the access-control boundary. Public replay can use spectator projections; participant views can include their own hand. Hidden decks/security should remain protected unless Aegis explicitly authorizes their disclosure after the match.
6. Separate schema versioning, retention, and size limits from presentation. Recordings need bounded growth and graceful compatibility errors, independently of playback controls.

Behavioral validation should cover immutable frame history, initial/final frames, finished-match download/import, reconnect redelivery, unauthorized perspective access, hidden-zone redaction, ordering of repeated actions, pause and boundary behavior, seeking, and the absence of gameplay messages from replay mode.
