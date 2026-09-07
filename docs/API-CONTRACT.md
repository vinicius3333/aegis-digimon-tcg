# Aegis API contract

The canonical wire types live in `packages/shared/src/protocol` and the
synchronized schema lives in `packages/shared/src/schema`. This document
describes their boundaries; source code remains authoritative for exact fields.

## Room

The API exposes the Colyseus room type `aegis`, implemented by `AegisRoom`.
Clients join with their authenticated context and selected deck. The server
assigns seats, validates the deck, creates the game, and publishes a
seat-filtered view.

## Intents

Clients request actions with the discriminated intent union exported by
`@aegis/shared`. Major families include:

- game setup and mulligan responses;
- play, digivolve, use-option, link, and attack actions;
- turn and phase progression;
- effect decisions and combat responses;
- surrender and room lifecycle actions.

An intent expresses a choice, never a state mutation. The engine validates the
actor, phase, source, targets, costs, and pending-interaction ownership before
changing state.

A `digivolve` intent with `appFusionLinkedInstanceId` explicitly declares App
Fusion using that linked partner. The result must be in the acting player's hand
and the base must be their battle-area Digimon. The server checks the pair
against the result's recipe, applies digivolution costs, and moves the partner
above the former top card in the evolution stack. Omitting the field retains
ordinary evolution; it does not automatically choose App Fusion.

## Synchronized state

The shared schema exposes:

- `GameState`: match status, active seat, phase, memory, players, winner, and
  pending interaction metadata;
- `PlayerState`: deck, hand, trash, security, breeding area, egg deck, battle
  area, and player flags;
- `Permanent`: controller, top card, digivolution cards, linked cards, DP, and
  suspension/breeding state;
- `CardInstance`: stable instance id, card id, owner, and visibility metadata.

Private zones are filtered per seat. The server must not expose hidden card
identities through schema fields, decisions, events, or error messages.

## Decisions and combat responses

Effects that need player input create a typed pending decision with a stable id
and owning seat. The answer must reference that id and satisfy its constraints.
Only one decision resolves at a time.

Combat windows use dedicated response intents for mechanics such as blocking,
Alliance, Evade, and Barrier. These are distinct from general effect decisions
because they belong to the attack sequence.

## Events and errors

State synchronization carries durable game state. Ephemeral presentation events
may describe animations, reveals, logs, or notifications, but clients cannot
depend on them as the sole record of game state.

Rejected intents return a stable failure result and leave authoritative state
unchanged. Unsupported card behavior fails loudly on the server and is covered
by engine tests.

## Compatibility

Protocol changes must remain compatible with the currently deployed web client
or ship with the controlled reload/versioning policy. Persistence compatibility
is handled separately by the numbered database migrations.
