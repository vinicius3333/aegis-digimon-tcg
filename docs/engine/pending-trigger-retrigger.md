# Pending trigger retrigger

A watcher whose trigger condition is met again before it activates triggers again (CR
§15-4-2-4). A trigger condition that occurs several times at the same moment triggers only once
(CR §15-5-2). [Once Per Turn] limits how often the effect activates, not how often it triggers:
after one instance resolves, the other instances can no longer activate.

## What counts as one occurrence

The engine publishes one event per subject and sometimes publishes the same event twice (an
entry window, then its trailing bus). Each publication is the same occurrence when one effect
body caused it. Each effect body and each outermost timing window gets a fresh token
(`effectBodyTokens`, `activeWindowToken`), and the trigger payload records it as
`causingEffectBody`.

- `subTriggerIdentity` keys a consumed watcher by its event discriminator when the event has one:
  the subjects for plays, leaves and suspensions, the event sequence for security removal,
  digivolution-card trashing and Option use. Other events fall back to `causingEffectBody`.
- `uniqueOncePerTurnWatcherOccurrences` merges pending copies of one [Once Per Turn] watcher only
  when they come from the same effect body. Link, digivolve, hand-trash and Option-use watchers
  keep their per-event identity.
- Attack declarations keep their previous identity: each attack is its own timing window, and its
  watchers expire before Counter Timing.
- `whenBattleWon` keeps its own rule: a later battle replaces the earlier pending occurrence.

A later occurrence is a derived trigger, so it activates before the older pending instance
(CR §15-4-5-2).

## Evidence

- `pending-once-per-turn-watchers-retrigger-on-second-option.test.ts` and its fixture recreate a
  reported Sakuyamon match. Taomon uses an Option, the egg's inherited effect digivolves it into
  Sakuyamon, and Sakuyamon uses a second Option. The inherited EX2-019 and BT17-031 watchers now trigger again for the
  second Option, and each still activates once.
- BT19-083 Rika Nonaka has no [Once Per Turn]. A later Option use in the same window now triggers
  it again; in the `suspension-before-zero-dp-deletion` replay each copy was already suspended,
  so the retrigger has no effect.
- In the `decode-iliad-sources` replay, BT25-085 and P-180 each place a [Three Musketeers] card
  under the same Digimon. The inherited BT25-005 watcher now triggers for the second placement
  and asks first. The recorded answers are unchanged; only the order of the two prompts swapped
  in the fixture.
- `subTriggerIdentity.test.ts` covers merging within one effect body and separation across bodies.
