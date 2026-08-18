# Aegis

A server-authoritative Digimon TCG simulator: the Colyseus API owns all rules
and state; the PixiJS web client renders state and sends intents only.

## Language

**UI Completeness**:
The state where every legal play is expressible through the client and every
decision the engine can request has a renderer, proven by contract tests.
Visual legibility (animations, event rendering) is explicitly not part of it.
_Avoid_: "100% na UI", polish

**Decision**:
A request from the engine for player input during effect resolution, keyed by
kind (optional, chooseTargets, selectCards, chooseOption, orderTriggers).
_Avoid_: prompt, dialog

**Combat Prompt**:
A combat-window interaction (block, alliance, evade, barrier) answered by a
dedicated intent rather than a Decision.

**Expander Tamer**:
A Tamer the player explicitly suspends, as an activation cost, to unlock
trash/under-Tamer zones as DigiXros material sources. The client never
auto-selects one; unlocking is always the player's explicit choice.

**Intent**:
A client-to-server message expressing a player's chosen action; the server
validates and applies it.
_Avoid_: command, action, move

**Behavioral Scenario**:
One of the ledger's end-to-end playability flows. It counts as **proven** only
when an automated test drives the protagonist's rendered UI through a real
room and asserts the rendered outcome; the ledger status is derived from the
tests, never hand-edited.
_Avoid_: "covered" (that word belongs to structural coverage)

**Protagonist**:
The seat performing the interaction a scenario proves; the only seat operated
through the public UI in that scenario. In response windows (block, evade,
barrier, alliance) the protagonist is the responder.

**Headless Opponent**:
The non-protagonist seat, driven by direct intents without UI. It exists to
open the scenario's window, never to be the subject of proof.

**Rigged Deck**:
A deck constructed so a scenario's window opens within the first turns under a
fixed seed. Scenarios reach their state only through real intents — the server
exposes no test-only state injection.

**Test Seam**:
`engine/testkit/` is the single module through which a test may touch the engine.
Arrange with a **Board Spec**, act through **Intents**, observe through the named
affordances in `observe.ts`. `GameEngine`'s collaborators stay private: the one
reach-through is `testkit/internals.ts`, and `testkitSeam.guard.test.ts` keeps
test-only members off the engine's interface. A missing affordance is added to the
seam, never worked around at the call site.
_Avoid_: "test helper", "fixture", `*ForTest` members.

**Board Spec**:
The declarative literal describing both seats' zones, passed to `setupEngine`.
Permanents are **established** by default — they entered before this turn, so
summoning sickness (§16-1) and the ＜Delay＞ gate treat them as old; a test opts into
a fresh arrival with `enteredThisTurn`. Aliases (`as:`) are the only way to obtain a
handle, and resolve fresh on each call so they survive digivolve and DNA merge.
_Avoid_: "setup object", "board builder", raw zone pushes in tests.

**Answer Queue**:
The ordered **Decision**s a scenario expects and the answers it gives. An unscripted
Decision fails the test rather than being silently auto-answered, so the Decision
sequence is itself an assertion.
_Avoid_: "auto-responder", "mock responses".

**Advance Surface**:
The small named set of sub-intent engine drivers the **Test Seam** exposes
(`advance.ts`: fire a timing, invoke an effect verb, arm a ledger) for behavior no
Intent can reach. Explicitly a back door, and explicitly inside the seam. Prefer an
Intent; reach here only when no Intent opens the window under test.
_Avoid_: "internals", "test hooks".

**Mutation Seam**:
`GameStateAccess` (`engine/state/access.ts`) is the single module allowed to
mutate a zone array. Every card move crosses it through the exported seam
functions (`insertCard`/`extractCardAt`/`extractCardById`/`takeTop`/`takeBottom`/
`clearZone`/`fillZone`/`placePermanent`/`extractPermanentAt`); a card always
returns to its owner's zone. Enforced by `mutationSeam.guard.test.ts`: a raw
`push`/`splice`/`shift` on a zone outside this module fails the build.
_Avoid_: mutating `player.hand`/`battleArea`/… directly.

## Player accounts and competition

**Account**:
The persistent Aegis identity that owns a player's profile, saved decks,
match history and tournament participation. It is distinct from a browser
identity and from a live game connection.
_Avoid_: user, session, player name

**Login Identity**:
A verified Discord identity or email address connected to exactly one Account.
An Account may have both, allowing the player to sign in by either method.
_Avoid_: account, credential

**Session**:
The revocable, short-lived authenticated browser state that proves an Account
to Aegis services. A Colyseus `sessionId` is only a transport connection, not
this Session.
_Avoid_: room session, player id

**Saved Deck**:
A named, versioned deck list owned by an Account. It is editable player data;
the deck used in a completed match is captured separately as a snapshot.
_Avoid_: deck snapshot, local deck

**Match Record**:
The immutable, server-created record of a completed human-vs-human match,
including players, result, mode and deck snapshots. It is the source of truth
for player statistics.
_Avoid_: game state, result counter

**Tournament Match**:
A scheduled pairing in a tournament round. Its official outcome is supplied by
one or more linked Match Records that complete its Match Series, or by an
audited organizer ruling.
_Avoid_: match record, game room, series

**Match Series**:
The best-of-one or best-of-three contest between the two participants in a
Tournament Match. It owns the shared clock and ends when its win target or
timeout policy is satisfied.
_Avoid_: game, room, tournament match

**Tournament Game**:
One played game inside a Match Series, backed by one authoritative game room
and one immutable Match Record.
_Avoid_: tournament match, series

**Top Cut**:
The optional single-elimination phase seeded from the frozen final standings
of a Swiss phase. At tournament creation it is enabled by a boolean flag; its
size is calculated and frozen from the confirmed attendance before round one.
_Avoid_: playoffs, manually sized bracket

**Volatile Tournament**:
A short-lived Aegis event that forms and progresses automatically as
participants arrive, withdraw or miss deadlines, without rewriting published
pairings or completed results.
_Avoid_: in-memory tournament, mutable history
