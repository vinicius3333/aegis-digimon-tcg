# Sealed engine rules

## Authorized profile and sources

The immutable engine profile is `sealed-v1`. Constructed remains the default for games and replay records without a policy. The profile is an engine contract, not a product configuration or room-admission mode.

The source ledger reviewed on 2026-10-31 uses the current [Digimon Card Game Sealed Battle Regulations](https://world.digimoncard.com/event/pdf/sealed_format_rules.pdf), two pages, retrieved PDF SHA256 `89380d245a429566bf37c6fd6e33aec70ea217043ff8a07a1f0ab9dc513e3060`. The [BT07 prerelease sheet](https://world.digimoncard.com/event/pre-release_BT-07/pdf/sealed_format_rules.pdf) is historical, not the active profile.

The [Comprehensive Rules Manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf), version 4.3, updated 2026-09-18, supplies the underlying mechanics: section 6-4-1 (one breeding action), section 8-1-3 (digivolution requirements and cost), section 9 (Option use), and section 10 (Link). These source identities are retained from the reviewed feature ledger, not a claim of a new source download.

## Policy boundaries

- Main decks contain forty cards; egg decks contain zero to five. Shape validation checks known cards, tokens and correct zones without the constructed same-number or restriction-list cap. It does not establish ownership or authorize allocation.
- Special rule 1 waives the color restriction on digivolution requirements, including ordinary, alternate and DNA recipes. Levels, names, traits, text, cost, source-zone restrictions, material count and distinct identities remain authoritative.
- The illustrated alternate requirement costs four from a level four with Save text: its colors are waived, not its level or Save predicate. The illustrated DNA recipe retains two level-six materials and cost zero.
- Explicit effect selection conditions remain authoritative, including a Hybrid effect selecting a particular Tamer color and a destination color selected by an effect. Option use, Link and DigiXros materials are not globally color-waived.
- Special rule 2 permits a face-up level-three Digimon from hand into an empty breeding area as the phase's single action. It is not played and implies no payment, draw, hatch or On Play trigger. Hatch, placement and moving out remain mutually exclusive actions. Automatic hatch is disabled under this profile so the player can choose placement.

The current regulations supersede historical wording that could be read as limiting the waiver to ordinary printed requirements. Product selection, owned-pool validation, private rooms and tournament lifecycle are outside this independent engine slice.

## Executable regressions

- `sealed-color-and-breeding.test.ts`: placement, no payment/draw/On Play, single action, ordinary waiver, Option colors and action generation.
- `sealed-special-requirements.test.ts`: alternate non-color gates, DNA levels/materials, explicit Hybrid selection, paid/free effect evolution and affordability.
- `sealed-reveal-digivolution.test.ts`: revealed-card evolution.
- `sealedCandidates.test.ts`: policy-aware bot candidates.
- `sealedDigivolveRoutes.test.ts`: server-projected ordinary and indexed alternate choices.
- `sealedPolicyReplay.test.ts`: policy-only room header, recorded placement/evolution, extraction, fresh replay, restored runtime snapshot and schema clone. The fixture activates policy without importing product or tournament configuration.
- `legacyPolicyReplay.test.ts`: an actual policy-absent room recording executes as constructed, including replay from a current runtime snapshot and schema clone.
- `gameRulesPolicy.test.ts`: absent-policy state hydration defaults, shape validation and append-only synchronized field ordering.
- `sealed-rookie-placement.spec.ts`: actual GameScreen placement controls; browser execution and manual media are separate acceptance gates.

Runtime snapshots retain the existing exact-code and schema-layout fingerprint checks. A historical recording can be replayed to produce a current snapshot; this does not promise that binary/runtime snapshots from a different engine revision can be restored across code fingerprints.

## Standalone private BO3

Private Sealed is available through the existing Private Match Rules selector. It uses the same `sealed-v1` engine profile, pool validator and versioned creator-selected product simulation described above. Each of exactly two seats receives six packs once, including guest seats. The creator’s persisted configuration controls the guest allocation, presentation and every game’s preparation timing. Only prefeature states without a configuration use BT4 compatibility. All currently supported products contain twelve pulls per pack. A browser's HttpOnly SameSite Strict cookie authenticates its seat; invitation URLs contain only the join code. Clearing that credential loses ownership of the existing seat, rather than allocating a replacement pool.

The Aegis BO3 interpretation permits pool-constrained exchange between games; this is an event policy, not a new claim about the official document's wording. An unjoined invitation expires after thirty minutes. Initial preparation lasts a separate full thirty minutes from first admission of the second authenticated seat; pools remain hidden until then. Host rejoins, duplicate guest admissions and creation retries do not extend that build deadline. If both legal decks are not locked by the deadline, preparation cancels. Between games, both players can lock their next decks to start early. At two minutes, each player's last legal submitted deck is used, including an unchanged previous deck for a player who did not ready again. A start request atomically freezes both snapshots. Ready retries cannot change those snapshots or an earlier game. Only authoritative room results advance the score; first to two wins completes the series and draws do not award wins.

Either seat can cancel or forfeit the series. Unplanned in-game disconnects use the ordinary room's reconnect grace and concession rules. Pools, ready revisions, deadlines, scores and locked snapshots survive process restarts; an active engine does not. A start/reconnect request finding its persisted room absent cancels the interrupted series instead of replaying a game or generating new pools. An allocated room with no players expires through the normal waiting-room timeout. Opponent pools are never listed, spectated or included in participant replays.

Completed private-game outcomes are journaled on the server before PostgreSQL delivery. While delivery is pending, another game cannot be authorized; reconciliation retries the same authoritative outcome. A result ledger prevents duplicate scoring, including after a later game has begun. The journal survives room disposal and can be replayed after process restart when its storage is retained. This recovers a completed outcome, not an active engine. If neither database nor journal storage could retain an outcome before the process was lost, the server cannot reconstruct it from a client claim.

Series retention deletes completed/cancelled parents after seven days and abandoned preparation/finished sideboarding parents seven days after their deadline, only when every actual game has a durable receipt. Proven unclaimed aborted allocations need no fabricated outcome; capability consumption and retirement serialize on the same parent lock so a late internal room cannot claim a retired game. Claimed, active and legacy-unknown allocations awaiting results remain protected. Compact game receipts survive deletion indefinitely for authoritative deduplication and conflict detection; bulky pools, decks, tokens and parent rows do not.

## Opening and browser presentation

Allocation remains immutable and server-owned. The shared original booster presents those existing packs without drawing or rerolling cards. The bounded deck editor receives only the multiset of completed packs. Selecting a carousel pack, drawing its allocated cards, charging, tearing, or revealing only part of a pack does not admit that pack to deck construction. Finishing the reveal or using the original Reveal all / Skip animations controls completes it. Animated bulk opening completes each pack at its original tear transition. Opened-history inspection cannot interrupt an unfinished opening or admit another pack.

One manifest-keyed source owns both the opener and builder progress. Its session-storage record retains separate drawn and completed counts plus the exact presentation phase, cards, batch and reveal cursor. Equivalent polling responses, reopening and same-tab reload restore that record. The stored version is upgraded in place from the earlier presentation format: a summary covering every drawn pack retains its completion; an unfinished first pack stays pending; an intact initial bulk batch retains only the packs whose transitions completed. Ambiguous legacy history summaries restart presentation from the immutable allocation because the old cursor cannot prove earlier reveal completion. Missing or invalid records start with zero eligible cards. This store is browser presentation, not server authorization. It does not synchronize across devices or independent tabs; those contexts must open their existing allocation themselves. Clearing storage loses presentation progress without changing the allocated pool. If storage is unavailable, in-memory progress works and the opener displays its existing storage warning.

Owned-copy and artwork limits use only eligible pulls. The API continues to validate final decks against the complete immutable pool and exact allocated printings; browser progress grants no new ownership. A client can already read its allocated pulls from its own API response. Server-side opening attestations and cross-device progress are outside this presentation change.
