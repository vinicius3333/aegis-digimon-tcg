# Replay animation and pacing review

The requested review covers replay presentation, timing and complex recorded matches. Keep the existing portable format, private account library, fullscreen controls and read-only board. The closed PR remains closed; corrections belong to the existing `replay-files` branch.

## Presentation contract

Rules batches are finer than visual actions. An attack can open a security reveal, wait for a chain of effects, strip a stack top, and resolve across many batches. Waiting for the entire presentation queue before delivering each subsequent rules batch prevents some cues from receiving their own completion event.

Use `presentationEnd` to supply a complete causal span to the existing presentation pipeline. Track physical effect identities, active attacks, security checks and passive stack-top promotions. Keep per-batch snapshots, including the board immediately before the span, so the existing arrival, deletion, memory and hand holds retain the exact states they need. After the queue becomes idle, continue at the next independent span. Manual seek still selects individual recorded frames and tears down prior cues.

Use the same sequential presentation mode as the live match. A replay must not default to the older concurrent effect mode while production sequences its clauses.

## Playback clocks

A virtual elapsed clock retains progress when playback pauses or changes speed. Clamp player thinking gaps to 1–2.5 unscaled seconds, then apply the selected playback rate. A long animation still owns its full duration; reading a later batch never cuts it short.

Queue waits alone cannot control CSS keyframes, transitions or Web Animations. Synchronize native animations within the replay board each animation frame, including animations mounted late. Resume only animations paused by this controller; preserve independently paused particle lights. The effects lab reuses the same helper through its existing document-wide wrapper. Cleanup restores owned playback rates and pauses.

The last recorded frame is still an action. Keep its controls active and report completion only after its queue settles. Pausing during the final action resumes that action rather than restarting the match. A presentation gate's safety budget excludes paused time, preventing a long manual pause from being mistaken for a lost handoff.

## Evidence

Generate complete replays from the real `AegisRoom`, deterministic development layouts, real intents and actual closed batches. Scenarios intentionally close with a test player's surrender after the target interaction, so they remain valid completed files. Generation uses the existing internal test recording seam; the server continues to exclude development scenarios from participant replay downloads.

Browser evidence uses the real `ReplayPlayer`, queue, animations and rendered board. A separate E2E entry observes presentation steps and gate expiries without adding browser globals to the product. Tests require an idle queue, no failed steps, no expired gates, no board-budget rescue, and a visible final board equal to the authoritative recording. Unit tests cover playback-clock continuity, pause ownership, causal dependencies and gate budgets. Existing presentation suites protect live behavior as well.
