# Manual rooms

## Product and architecture

Add public manual matchmaking and invite-only manual rooms to Aegis. Players resolve printed effects and rules themselves, as at a physical table. Reuse the catalog, decks, card rendering, design system, connection router and clustered invite directory.

Use a dedicated ManualRoom and manual table controller. Adapting GameEngine would couple manual actions to automatic legality and triggers; a separate application would duplicate navigation and infrastructure.

## Interaction prototypes

Compare a persistent side inspector, a bottom action dock and card-local menus against the same sample board. The question is whether players can move cards and manage evolution sources without losing board context. Preserve Aegis typography, colors and artwork. The side inspector is the default candidate: visible destinations and stack placement support keyboard and touch without requiring dragging. Variants are development-only and disposable; record their result here before absorbing the chosen layout.

## Scope

- Lobby: Manual mode with public queue, invite creation and code entry. Links select manual mode; queues never match automatic rooms.
- Setup: shuffled decks, five-card hand, optional one-time mulligan, ready agreement, five security cards and first-player selection. Catalog cards do not require executable behavior. Validate standard deck shape and printed copy limits; omit ban-list enforcement for casual manual play.
- Table: hand, deck, eggs, security, trash, reveals, battle and breeding. Move cards and whole stacks, add above/below stacks or link cards, suspend, annotate DP and notes, draw, hatch, shuffle, reveal, recover and check security. Costs and effects are explicit player actions.
- Shared controls: memory, turn ownership, attack announcements, dice, text chat, concession and history.
- Corrections: opponent approval to undo the latest board mutation. Requests identify a revision and expire on another mutation. Revealed knowledge cannot be forgotten.
- Networking: server-owned table with command shape, ownership and bounds checks. Seat-filtered snapshots withhold hidden identities and ordering. Explicit search/reveal is logged. Reconnection and reload retain the seat; stale commands are rejected and disconnected actions are not replayed.
- Excludes ranked results, bots, automatic effects, tournament integration and best-of-three.

## Implementation and acceptance

Implement protocol/controller with behavioral tests, room registration and privacy, UI prototypes and production board, lobby/invite/deployment/reload integration, then real two-client network/browser verification. Run typechecking, focused and full suites, lint, formatting and review; commit and push the feature branch.

Two users must be able to enter either kind of room, complete setup, play, correct a move by agreement, reconnect and concede. Hidden identities remain hidden unless explicitly exposed; cards and stack sources are conserved. Existing automatic flows stay green. Essential controls support keyboard and small screens. No prototype switcher ships in production.

## Prototype result

All three variants rendered and completed a card move in Chromium. Screenshots: [sidebar](manual-room-prototypes/sidebar.png), [bottom dock](manual-room-prototypes/dock.png), [card-local controls](manual-room-prototypes/local.png). Adopt the sidebar: it keeps destinations and source placement visible while leaving both players' fields unobstructed. On narrow screens controls follow the board. Absorb that choice into the tested production ManualBoard and remove the temporary route and switcher.

## Review follow-up

Independent Standards and Spec reviews identified missing production invite routing and deployment accounting, unequal reconnect deadlines, unguarded browser Back, inaccessible source reordering, reversed bottom-stack order, incomplete attack announcements and absent token operations. Correct these before delivery. Use the same production invite resolver in browser tests, count both room modes toward deployment retirement, share a 120-second manual reconnect constant, reuse the existing navigation guard, expose source reordering, preserve bottom order, identify attackers/targets without revealing facedown identities, and provide catalog token creation/removal. Add focused regressions for those cases. Final review also caught premature readiness and retained reconnect storage after confirmed browser navigation; reject readiness until both seats exist and clear the owned reconnect token on teardown. Controller and browser regressions cover waiting-room readiness and leaving before entering a new table. Both reviewers confirmed these fixes.

## Verification baseline

The full shared suite passed (622 tests), and the full API run passed 53,540 tests with five failures. Those same five failures reproduce on the untouched base commit `5317e5920`: BT16-077 and BT20-016 effect-attack timing (Q4298), BT26-012 full Option cost (Q6967), EX12-067 full Option cost (Q6872), and EX12-068 full Option cost (Q6875). They are existing automatic card issues outside the manual-room change. Keep feature validation and this baseline distinction explicit in the PR.
