# EX12 strict card-by-card audit

Scope: EX12-001 through EX12-077, audited independently in ascending order with the
`verify-card-implementation` workflow. A card receives 10/10 only after its complete
catalog record, local KB results, direct IR module, shared runtime semantics, peer risks,
and observable behavioral tests have been checked. Collection gates do not substitute
for the individual evidence below.

## EX12-001 — Nyaromon — 10/10

- **Printed contract:** Yellow level 2 Digi-Egg, Lesser/VB. Its inherited
  `[End of Your Turn]` effect requires the host to have the VB trait, optionally DNA
  digivolves that host together with any one other own Digimon into a VB Digimon card
  in hand, pays the destination's DNA cost, and then independently allows the resulting
  Digimon to attack.
- **KB evidence:** `node tools/kb/query.mjs card EX12-001`; Q6722 confirms that the
  resulting Digimon's `[When Digivolving]` and `[When Attacking]` effects both trigger
  before the inherited effect finishes and can be activated in either order. Comprehensive
  Rules 15-4-2 through 15-4-4 define simultaneous triggering and pending activation.
- **Implementation trace:** `EndOfYourTurn` + `isInherited` maps the timing and source;
  `selfHasTrait(VB)` gates the host; `DnaDigivolve.materials.filter.includesSelf` pins the
  host while `count: 2` selects one other own Digimon; `into` restricts the hand result to
  VB; `payCost: true` preserves the destination recipe/cost; `bindResultAs: dnaResult`
  scopes the following optional `Attack` to the new permanent. The shared DNA handler
  pre-fills self, excludes it from partner selection, and calls `canDnaDigivolve` against
  the destination's printed material requirements.
- **Correction:** removed the erroneous VB trait filter from the material pool. It had
  required both materials to be VB even though the printed text permits any other
  Digimon. The host remains VB-gated and fixed as a material.
- **Behavioral proof:** the colocated suite now uses non-VB EX12-054 as a legal partner;
  proves the realistic EX12-042 + EX12-054 to EX12-044 evolution stack; observes both
  EX12-044 timing effects from Q6722 via the combined DP change; verifies zero paid DNA
  cost, host-trait rejection, invalid level/material rejection, missing-partner rejection,
  refusal of the DNA action, and independent refusal of the resulting attack.
- **Peer/mechanism proof:** EX12-044 supplies the real VB DNA destination and four printed
  color recipes; EX12-054 is the mixed-trait comparison; the focused
  `filter.includesSelf on DnaDigivolve materials` capability test verifies the shared
  source-pinning seam.
- **Verification:** `EX12-001.test.ts` — 7/7 passed; focused DNA capability regression —
  1/1 passed. No residual IR, unsupported behavior, or unresolved card-specific ambiguity.

## EX12-002 — Mococomon — 10/10

- **Printed contract:** Yellow level 2 Digi-Egg, Smoke/Shambala/SW. During its
  controller's turn, once per turn, another own SW Digimon being played triggers the
  inherited effect. Its host may legally digivolve into an SW Digimon card in hand,
  paying the normal digivolution cost reduced by 2.
- **KB evidence:** `node tools/kb/query.mjs card EX12-002`; Q6723 says the played
  Digimon's `[On Play]` and Mococomon's inherited effect trigger simultaneously. If
  Mococomon resolves first and digivolves, the newly derived `[When Digivolving]`
  effect must activate before the still-pending `[On Play]` effect. Comprehensive Rules
  15-4-4 through 15-4-5 define pending activation and derived-trigger priority.
- **Implementation trace:** persistent `YourTurn` installs a `whenPlayed` watcher;
  `controller: mine`, `excludeSelf`, `kind: Digimon`, and exact SW trait matching scope
  the event. The nested `Digivolve` pins Mococomon's host, searches only the hand for an
  SW Digimon, enforces the destination's printed requirements, pays cost, applies the
  two-memory reduction, and remains optional. The watcher carries a stable once-per-turn
  key across continuous recomputation.
- **Corrections:** added the missing `payCost: true`; previously every accepted evolution
  was free and the old cost-2 fixture concealed the error. The shared pending-watcher
  adapter now retains whether its printed source was inherited or linked, so the kernel
  does not reject a valid buried source. The resolver now treats derived triggers as a
  separate priority tier even when the derived and pending effects share a controller,
  closing Q6723's same-player ordering case.
- **Behavioral proof:** the positive stack is EX12-002 → EX12-006 → EX12-012 and then
  EX12-045, whose cost 3 becomes 1; memory visibly moves from 0 to -1. Tests reject a
  non-SW played Digimon, an opponent's SW Digimon, the host itself, the opponent's turn,
  and legal Shambala-but-not-SW EX12-011. They prove optional refusal, once-per-turn
  consumption, and a second otherwise-legal EX12-045 evolution being blocked.
- **Ruling proof:** a real EX12-022 play offers EX12-022 and inherited EX12-002 as
  simultaneous triggers. Choosing Mococomon first produces the observable resolution
  order EX12-002 → derived EX12-012 `[When Digivolving]` → pending EX12-022 `[On Play]`,
  exactly as Q6723 requires.
- **Verification:** `EX12-002.test.ts` — 9/9; stack, sub-trigger, and CR 15-4 focused
  suites — 93/93; interpreter, primitives, and capability regressions — 586/586;
  workspace typecheck passed. No residual IR, unsupported behavior, or unresolved
  card-specific ambiguity.

## EX12-003 — Kapurimon — 10/10

- **Printed contract:** Black level 2 Digi-Egg, Lesser/ME. Its inherited all-turns
  replacement triggers when any own ME Digimon would leave the battle area other than
  by its controller's effects. One such leaving Digimon and any other own Digimon may
  DNA digivolve into an ME Digimon card in hand, subject to the destination's real DNA
  recipe and cost.
- **KB evidence:** `node tools/kb/query.mjs card EX12-003`; Q6724 forbids destinations
  without `[DNA Digivolve]`; Q6725 forbids materials outside the printed recipe; Q6726
  defines “other Digimon” relative to the chosen leaving ME Digimon; Q6727 confirms the
  new DNA Digimon does not continue the original leave operation.
- **Implementation trace:** inherited `AllTurns` installs a `wouldLeavePlay` replacement;
  `leaveCause: otherThanYourEffect` admits battle, rules, and opponent-effect leaves but
  rejects the controller's own effects. The replacement filters to own ME Digimon,
  `includeRef: triggerSubject` pins the leaving permanent, and `count: 2` adds exactly one
  different own Digimon. The hand result is ME-filtered; `payCost: true` and the canonical
  DNA legality check preserve the printed recipe and cost.
- **Behavioral proof:** real EX12-016 + EX12-055 → EX12-017 DNA succeeds at cost 0 and
  consumes both materials. A separate leaving EX12-055 can use Kapurimon's EX12-016 host
  as the “other” material. Tests reject an ME card with no DNA recipe (Q6724), a wrong-level
  partner (Q6725), non-ME and opponent-controlled leaving Digimon, and a leave caused by
  the controller's own effect; optional refusal allows the original deletion.
- **Correction and ruling proof:** the return-to-hand path previously followed the old
  EX12-016 instance into the newly created EX12-017 stack and pulled that material out,
  violating Q6727. The shared bounce filter now revalidates that a requested card is still
  the top of the same original permanent after replacements resolve. The resulting
  EX12-017 and its complete EX12-016/EX12-003/EX12-055 stack remain in play; the same seam
  protects return-to-deck because both verbs share this filter.
- **Verification:** `EX12-003.test.ts` — 10/10; DNA, leave-prevention, primitives, and
  capability regressions — 426/426; workspace typecheck passed. No residual IR,
  unsupported behavior, or unresolved card-specific ambiguity.

## EX12-004 — Onibimon — 10/10

- **Printed contract:** Purple level 2 Digi-Egg, Ghost/Shambala/TB. During its
  controller's turn, its inherited effect grants ＜Execute＞ to the host only while
  that Digimon has the TB trait. Execute optionally attacks at end of turn, may target
  an unsuspended opposing Digimon, and schedules deletion of the attacker at end of attack.
- **KB evidence:** `node tools/kb/query.mjs card EX12-004`; Q6728 says Execute's pending
  deletion and EX12-046 Shishimamon's inherited `[End of Attack]` trigger simultaneously
  and may resolve in either order. If Execute deletes the host first, Shishimamon's
  inherited effect can no longer activate.
- **Implementation trace:** inherited `YourTurn` + `selfHasTrait(TB)` continuously grants
  the keyword to the host. A gained Execute now installs the same generic attack and
  end-of-attack deletion abilities used by a printed Execute card, anchored on the host's
  top instance. The attack carries `attackMechanic: Execute` through the combat controller
  and drains `[When Attacking]` effects before battle continues. The deletion has both
  `triggerAttackBy(Execute)` and `triggerAttackerIsSelf` gates, so unrelated attacks and
  other Execute users cannot delete this host.
- **Corrections:** a granted Execute was previously only a continuous keyword label and
  could not attack. Printed Execute also deleted after the whole combat action returned,
  too late to share the end-of-attack activation pool. Execute is now split into its
  optional end-turn attack and a real EndOfAttack deletion. The placement kernel now
  rejects a pending inherited/linked effect whose source is off-field unless the current
  deletion snapshot proves the role that made it active.
- **Ruling proof:** a real TB host with EX12-046 and EX12-004 in its stack attacks through
  the production end-turn/combat path. The ordering request contains exactly the inherited
  Shishimamon effect and Execute deletion. Choosing Shishimamon first plays EX12-009 and
  then deletes the host; choosing Execute first deletes the complete stack and leaves
  EX12-009 in hand because the inherited source has lost its placement.
- **Negative and mechanism proof:** non-TB hosts and the opponent's turn do not receive
  Execute. The existing printed-Execute test still proves an attack against an unsuspended
  Digimon and self-deletion, while a no-keyword control remains inert.
- **Verification:** `EX12-004.test.ts` — 6/6; Execute/Partition — 6/6; placement kernel —
  18/18; combat controller — 23/23; interpreter — 171/171; primitives — 126/126;
  EX12-046 peer suite — 5/5; workspace typecheck and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved card-specific ambiguity.

## EX12-005 — Agumon — 10/10

- **Printed contract:** Red level 3 Digimon, Reptile/VB, play cost 3 and 2000 DP.
  It normally digivolves from a red level 2 for cost 0 and also has two cost-0
  alternatives: any Koromon by name, or any level-2 card with the VB trait. On play,
  its controller may trash one Greymon-name or VB-trait card from hand to draw 2.
  Its inherited `[Your Turn]` effect gives only its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-005` returns no card-specific
  rulings. Comprehensive Rules §15-9 distinguishes mandatory triggering from optional
  processing: the “By trashing” activation cost may be declined, but Draw 2 cannot
  resolve unless that cost was paid.
- **Implementation trace:** the hand filter is an OR of exact name containment
  `Greymon` and exact trait `VB`, scoped to one own hand card. `optional: true` offers
  activation only when the cost is payable and `abortOnDecline: true` prevents Draw 2
  after refusal or failed payment. The inherited `YourTurn` permanent self modifier is
  re-derived from the buried source and lapses outside its controller's turn.
- **Correction:** the generated action was mandatory and forced the player to discard
  whenever a matching hand card existed. It now uses the repository's established
  optional paid-action shape, while retaining a fixed one-card cost when accepted.
- **Behavioral proof:** BT1-015 proves the Greymon-name branch without VB; EX12-007
  proves the VB branch without Greymon. Both discard exactly the selected card and draw
  two. A dedicated refusal keeps the cost card in hand and deck unchanged; a no-match
  control draws nothing. Evolution succeeds at zero memory through standard red
  BT1-001, off-color Koromon BT11-005, and off-color VB EX12-001, while black non-Koromon,
  non-VB BT10-005 is rejected. Two hosts prove the inherited DP stays scoped and turns
  off/on with turn ownership.
- **Verification:** `EX12-005.test.ts` — 9/9; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  card-specific KB ruling, or unresolved ambiguity.

## EX12-006 — Kakamon — 10/10

- **Printed contract:** Red level 3 Digimon, Beast/Shambala/SW, play cost 3 and
  2000 DP. It normally digivolves from a red level 2 for cost 0 or alternatively
  from any level-2 Shambala card for cost 0. At the start of its controller's main
  phase, its controller may trash one SW card from hand to draw 1 and gain 1 memory.
  Its inherited `[Your Turn]` effect gives its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-006` returns no card-specific
  rulings. Comprehensive Rules §15-9 governs the optional “By trashing” processing:
  one accepted and successfully paid cost gates both following benefits.
- **Implementation trace:** `StartOfYourMainPhase` supplies the owner-turn gate. The
  first action is optional with `abortOnDecline`, pays exactly one own hand card with
  the exact SW trait, then draws 1. `GainMemory(1)` is the second action in the same
  body, so it follows only after the first action's accepted cost without paying that
  cost twice. The inherited continuous DP modifier is self-scoped and owner-turn gated.
- **Corrections:** the generated action forced the hand discard whenever payable and
  relied on `ifThisEffectActed` on GainMemory. The action now permits refusal, explicitly
  fixes the cost zone to hand, aborts the whole clause on refusal or failed payment, and
  lets both printed benefits follow the single successful cost rather than making memory
  conditional on the Draw action's result receipt.
- **Behavioral proof:** a real EX12-022 SW card is trashed once, exactly one card is
  drawn, and memory increases by 1. Refusal preserves hand, deck, trash, and memory;
  a non-SW hand has the same no-benefit result without a payable cost. The effect is
  silent during the opponent's turn. Standard red BT1-001 and off-color Shambala
  EX12-004 both evolve for 0, while off-color non-Shambala BT10-005 is rejected. A
  second host proves the inherited +2000 does not leak and the bonus lapses/reappears
  as turn ownership changes.
- **Verification:** `EX12-006.test.ts` — 8/8; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  card-specific KB ruling, or unresolved ambiguity.

## EX12-007 — Gammamon — 10/10

- **Printed contract:** Red/yellow level 3 Digimon, Ceratopsian/VB, play cost 3
  and 2000 DP. Its standard red and yellow level-2 evolution routes cost 1; it
  alternatively evolves from Gurimon by name or a level-2 VB card for cost 0.
  On play it reveals the top 3, adds one card with Gammamon in its text and one
  VB-trait card, and returns the rest to deck bottom. Its inherited owner-turn
  effect gives only its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-007`; Q6729 defines “a card
  with X in its text” as spanning the card's name, traits, effects, inherited
  effects, Rule, evolution/DNA/DigiXros/Burst/App Fusion/Link/Assembly requirements,
  and icons. The shared `match:"text"` predicate searches name and traits plus the
  catalog's effect, inherited, security, link, requirement, dual, and option text.
- **Implementation trace:** `RevealAdd` has two sequential count-1 slots. The first
  uses the full text-union matcher for Gammamon; the second uses exact VB trait
  matching. The reveal handler removes each selected physical instance from later
  slots, accumulates both chosen cards for one hand move, and bottoms every untaken
  revealed card. The inherited DP effect is self-scoped and owner-turn gated.
- **Ruling and behavioral proof:** a direct predicate proof matches BT21-002 from
  its inherited text even though its name is Gurimon and its traits lack VB. The
  production RevealAdd path finds non-Gammamon-name/non-VB BT15-039 through printed
  effect text and independently adds EX12-005 through VB. RB1-005 proves name-based
  text matching; a reveal containing only one EX12-007 proves a physical card that
  satisfies both slots is added once, not duplicated. Missing categories add only
  what exists and bottom the rest in stable order.
- **Evolution and inherited proof:** red BT1-001 and yellow BT12-003 each pay the
  normal cost 1; Gurimon BT21-002 and VB EX12-001 use their cost-0 alternatives;
  black non-Gurimon/non-VB BT10-005 is rejected. A second host and turn changes prove
  the inherited +2000 is neither board-wide nor active during the opponent's turn.
- **Verification:** `EX12-007.test.ts` — 8/8; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  or unresolved card-specific ambiguity.

## EX12-008 — ToyAgumon — 10/10

- **Printed contract:** Red level 3 Digimon, Puppet/ME, play cost 3 and 2000 DP. It
  normally digivolves from a red level 2 for cost 0 or alternatively from any
  level-2 ME card for cost 0. At the start of its controller's main phase, its
  controller may trash one Puppet- or ME-trait card from hand to draw 1 and gain
  1 memory. Its inherited effect grants Raid to its host.
- **KB evidence:** `node tools/kb/query.mjs card EX12-008` returns no card-specific
  rulings. The optional “By trashing” activation-cost rule is the same established
  processing audited on EX12-005 and EX12-006: refusal or failed payment stops both
  benefits, while a successful single payment gates the complete following clause.
- **Implementation trace:** `StartOfYourMainPhase` provides the owner-turn gate. The
  first action is optional and aborts on refusal, pays exactly one own hand card whose
  traits contain Puppet or ME, and attempts Draw 1. The following unconditional
  `GainMemory(1)` remains in that accepted effect body, so it neither charges a second
  cost nor depends on whether a card was actually available to draw. The inherited
  static keyword is derived only from a buried EX12-008 source.
- **Corrections:** the hand-trash cost was mandatory, its filter omitted the explicit
  hand zone, and `ifThisEffectActed` incorrectly made memory depend on the Draw action's
  result. The cost is now optional with `abortOnDecline`, explicitly hand-scoped, and
  shared by both independently resolving printed benefits.
- **Behavioral proof:** EX12-041 proves the ME-only payment branch and BT1-038 proves
  the Puppet-only branch. Accepted payment with an empty deck still gains 1 memory;
  refusal and an unpayable hand preserve hand, deck, trash, and memory. A manually
  fired start-main timing during the opponent's turn stays inert. A host with buried
  EX12-008 has Raid while a standalone EX12-008 does not. Standard red BT1-001 and
  off-color ME EX12-003 both evolve for 0; off-color non-ME BT10-005 is rejected.
- **Verification:** `EX12-008.test.ts` — 9/9; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  card-specific KB ruling, or unresolved ambiguity.

## EX12-009 — Wankomon — 10/10

- **Printed contract:** Red level 3 Digimon, Beast/Shambala/TB, play cost 3 and
  2000 DP. It normally digivolves from a red level 2 for cost 0 or alternatively
  from any level-2 Shambala card for cost 0. On play it reveals the top 3 cards,
  adds one Shambala card and one TB card, and returns the rest to deck bottom.
  Its inherited owner-turn effect gives only its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-009` returns no card-specific
  rulings. The two printed “1 card” selections are independent, but the same physical
  revealed card cannot be moved to hand twice; each selected instance is removed from
  the pool before the next selection.
- **Implementation trace:** `RevealAdd(3)` contains sequential count-1 exact-trait
  filters for Shambala and TB and uses `rest: deckBottom`. The shared reveal handler
  excludes already selected instances, combines the successful selections into the
  hand move, and bottoms all unselected cards in stable reveal order. The inherited
  `YourTurn` modifier targets self for a permanent +2000 that is continuously re-derived.
- **Behavioral proof:** distinct EX12-006 Shambala and EX12-011 TB cards are both added;
  a single EX12-011 satisfying both filters enters hand once; a reveal with only the
  Shambala category adds only that card; and a reveal with no matches bottoms all three
  in order. A separate standalone Digimon proves the inherited DP does not leak, and
  turn changes prove it lapses and returns. Standard red BT1-001 and off-color Shambala
  EX12-004 evolve for 0, while off-color non-Shambala BT10-005 is rejected.
- **Verification:** `EX12-009.test.ts` — 8/8; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No implementation correction was needed;
  there is no residual IR, unsupported behavior, card-specific ruling, or ambiguity.

## EX12-010 — Greymon — 10/10

- **Printed contract:** Red/black level 4 Digimon, Dinosaur/ME/VB, play cost 5 and
  5000 DP. Its normal red and black level-3 evolutions cost 3; a level-3 Digimon
  with Agumon in its name or either ME or VB trait costs 2. It has printed Raid.
  On play and when digivolving, it may return one own trash Digimon with Greymon
  in its name or the VB or ME trait to hand. Its inherited effect also grants Raid.
- **KB evidence:** `node tools/kb/query.mjs card EX12-010` returns no card-specific
  rulings. The shared evolution matcher treats `names:["Agumon"]` as name containment
  and `traits:["ME","VB"]` as an OR, matching the printed “in name or ... ME/VB” text.
- **Implementation trace:** separate `OnPlay` and `WhenDigivolving` Return actions use
  the same own-trash, Digimon-kind, count-1 filter. Its name and trait match groups are
  alternatives and the move is optional. Distinct top-level and inherited Static effects
  install Raid in each printed placement. Both alternate evolution requirements are
  level-gated and cost 2, while catalog evolution costs preserve both normal colors.
- **Behavioral proof:** EX12-005 proves VB recovery, EX12-008 proves ME recovery, and
  BT1-015 proves Greymon-name recovery without either trait. An unrelated card is not
  moved and explicit refusal leaves a matching card in trash. A standalone EX12-010,
  an unrelated host with buried EX12-010, and a no-source control separately prove the
  printed and inherited Raid placements. Normal red EX12-005 and black BT11-036 pay 3;
  Agumon BT12-059, VB EX12-021, and ME EX12-038 each pay the alternate 2; green Goblimon
  BT1-064 is rejected.
- **Verification:** `EX12-010.test.ts` — 9/9; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No implementation correction was needed;
  there is no residual IR, unsupported behavior, card-specific ruling, or ambiguity.

## EX12-011 — Seasarmon — 10/10

- **Printed contract:** Red level 4 Digimon, Holy Beast/Shambala/TB, play cost 5 and
  5000 DP. Its normal red level-3 and alternate level-3 Shambala evolutions both cost 2.
  It has Raid. On play and when digivolving it deletes one opposing Digimon with 5000 DP
  or less. Its inherited owner-turn effect gives only its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-011` returns no card-specific
  rulings. The printed DP threshold is inclusive and the deletion is opponent- and
  Digimon-scoped; no optional wording modifies either trigger.
- **Implementation trace:** identical mandatory count-1 Delete actions at `OnPlay` and
  `WhenDigivolving` filter opponent Digimon by `dp <= 5000`. A top-level Static effect
  supplies Raid. The inherited `YourTurn` permanent self modifier is continuously
  re-derived, and the alternate evolution requirement is exact level 3 plus Shambala.
- **Behavioral proof:** both timing windows delete a 5000-DP boundary target while a
  6000-DP Digimon survives; an own 1000-DP Digimon is never eligible. Separate permanents
  prove printed Raid, host-only inherited DP, and the bonus lapsing and returning across
  turn changes. Standard red EX12-005 and off-color Shambala EX12-006 both pay 2, while
  off-color non-Shambala BT1-064 is rejected.
- **Verification:** `EX12-011.test.ts` — 8/8; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No implementation correction was needed;
  there is no residual IR, unsupported behavior, card-specific ruling, or ambiguity.

## EX12-012 — Apemon — 10/10

- **Printed contract:** Red level 4 Digimon, Beastkin/Shambala/SW, play cost 4 and
  4000 DP. Its normal red level-3 and alternate level-3 Shambala evolutions cost 2.
  It has Raid. On play and when digivolving, its controller may trash one SW card
  from hand to draw 2. Its inherited owner-turn effect gives only its host +2000 DP.
- **KB evidence:** `node tools/kb/query.mjs card EX12-012` returns no card-specific
  rulings. The “By trashing” processing is an optional activation cost in each timing;
  refusal or inability to pay prevents Draw 2 without suppressing the normal evolution draw.
- **Implementation trace and correction:** both Draw actions use the same exact own-hand,
  SW-trait, count-1 trash cost. They were incorrectly mandatory. Each now has
  `optional:true` and `abortOnDecline:true`, so acceptance pays once before Draw 2 and
  refusal aborts that effect body. Raid remains top-level; the inherited `YourTurn`
  self modifier and the level-3 Shambala alternate requirement remain fully represented.
- **Behavioral proof:** both On Play and When Digivolving pay one real SW card and draw
  exactly two; both timings also permit explicit refusal. The evolution refusal test
  distinguishes its mandatory rules draw from the declined effect's Draw 2. An unpayable
  hand is inert. Separate permanents and turn changes prove inherited DP scope and timing.
  Standard red EX12-005 and off-color Shambala EX12-006 pay 2, while green non-Shambala
  BT1-064 is rejected.
- **Verification:** `EX12-012.test.ts` — 9/9; workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  card-specific ruling, or unresolved ambiguity.

## EX12-013 — BetelGammamon — 10/10

- **Printed contract:** Red/yellow level 4 Dragonkin/VB, play cost 5 and 6000 DP.
  Normal red/yellow level-3 evolution costs 3; Gammamon-name or level-3 VB alternatives
  cost 2. Its once-per-turn Main may play a matching Digimon/Tamer or use a matching
  Option from hand, paying its cost reduced by 2. Its inherited effect grants Barrier.
- **KB evidence:** Q6730 defines the complete card-text union; Q6731 forbids combining
  two copies' activations for one play/use; Q6732 permits the play under Solarmon but
  suppresses reduction; Q6733 permits activation under Pomumon but blocks the effect play.
- **Implementation trace:** a count-1 Modal separates play from Option use. Both branches
  match Gammamon text or exact VB trait, pay cost with `reduceCostBy:2`, and remain optional.
  Main is `OncePerTurn`; the inherited Static effect installs Barrier. Alternate evolution
  requirements independently cover name and level-3 VB.
- **Ruling proof:** AD1-007 proves effect-text matching without Gammamon in its name or VB
  trait. Two EX12-013 copies still reduce one EX12-007 by only 2. With opposing ST12-03,
  EX12-007 is played for its full cost 3; with opposing BT9-047, activation succeeds but
  the target stays in hand and no memory is paid. A VB Digimon and Gammamon-text Option
  prove both modal branches, and a second activation is rejected.
- **Placement and evolution proof:** a buried EX12-013 grants Barrier only to its host.
  Normal red EX12-005 and yellow EX12-040 pay 3; Gammamon RB1-005 and off-color VB
  EX12-021 pay 2.
- **Verification:** `EX12-013.test.ts` — 11/11 with no error log; workspace typecheck,
  focused formatting, focused lint, and `git diff --check` passed. No implementation
  correction was needed; there is no residual IR, unsupported behavior, or open ruling.

## EX12-014 — Canoweissmon — 10/10

- **Printed contract:** Red/yellow level 5 Sky Dragon/VB, play cost 7 and 7000 DP.
  Normal red/yellow level-4 evolution costs 4; level-4 Gammamon-text or VB alternatives
  cost 3. Printed and inherited Decode may play a level-4-or-lower Gammamon-text or VB
  Digimon from this Digimon's sources when it would leave other than by battle. On play
  and evolution it may place a matching level-5-or-lower Digimon from hand/trash under
  itself; then one own Digimon may attack.
- **KB evidence:** Q6734 defines the full text union. Q6735 confirms the level qualifier
  applies to both sides of each OR. Decode's comprehensive rule requires a real
  would-leave, other-than-battle replacement; the played source does not prevent the host's leave.
- **Corrections:** both Decode placements were label-only and therefore could not execute.
  Printed and inherited `AllTurns` replacements now play a matching source for free with
  `playedByDecode:true` and `leaveCause:otherThanBattle`. The optional PlaceUnder actions
  also incorrectly used `abortOnDecline`, suppressing the independent “Then” attack; that
  abort was removed.
- **Behavioral proof:** printed and buried EX12-014 each play EX12-013 from their stack
  before an effect deletion while the original host still leaves; a battle deletion plays
  nothing. Level-5 non-VB BT10-011 is accepted through Gammamon text, while level-6 VB
  EX12-017 is rejected and the following attack still occurs (the chosen attacker reaches
  security and is deleted in battle). Hand/trash and both entry timings are covered.
  Normal red EX12-011 and yellow BT1-051 pay 4; text-matching BT21-019 and off-color VB
  EX12-024 pay 3; green BT1-069 is rejected.
- **Verification:** `EX12-014.test.ts` — 10/10 with no error log; leave-prevention mechanism
  suite — 10/10; workspace typecheck, focused formatting, focused lint, and `git diff --check`
  passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-015 — Gokuumon — 10/10

- **Printed contract:** Red/yellow level 5 Beastkin/Shambala/SW, play cost 7 and 7000 DP.
  Normal red/yellow level-4 evolution costs 4; level-4 Shambala costs 3. DigiXros -2 uses
  one level-5-or-lower Gokuumon-text or SW Digimon. It has Raid. On play/evolution it gives
  one opponent -4000 DP through their turn end; then another own SW Digimon may gain Alliance
  and, if chosen, must attack. Its inherited optional attack trigger deletes DP 6000 or less
  once per turn.
- **KB evidence:** Q6736 defines the text union; Q6737 makes the attack mandatory after accepting
  Alliance; Q6738 applies the level-5 ceiling to both DigiXros alternatives; Q6739 delays the
  simultaneous DP-0 rule deletion until the complete activated effect, including its attack,
  finishes.
- **Corrections:** the executable module omitted DigiXros entirely, while the generated shared
  recipe dropped `levelMax` and ANDed split text/trait predicates. Module, committed JSON, and
  shared override now expose one level-capped OR slot reducing cost by 2. `GainKeyword` also
  failed to publish `lastEffectActed`, so the conditioned same-target attack never ran; the
  shared runner now records whether a recipient was actually chosen.
- **Ruling proof:** accepting Alliance produces `attackDeclared` for the chosen SW Digimon;
  declining produces none. A real 4000-DP target remains through that attack and is deleted by
  the following rule check. Level-3 SW EX12-006 and level-5 non-SW Gokuumon BT12-039 each pay
  DigiXros cost 5 and enter as material; level-6 SW EX12-019 is rejected. The inherited deletion
  accepts the 6000 boundary, rejects 7000, and a second firing cannot delete another target.
- **Evolution proof:** normal red EX12-011 and yellow BT1-051 pay 4; off-color Shambala EX12-025
  pays 3; off-color non-Shambala BT1-069 is rejected.
- **Verification:** `EX12-015.test.ts` — 11/11; interpreter — 171/171; DigiXros OR-material
  mechanism — 3/3; workspace typecheck, focused formatting, focused lint, and `git diff --check`
  passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-016 — MetalGreymon — 10/10

- **Printed contract:** Red/black level 5 Cyborg/ME/VB, play cost 7 and 7000 DP. Normal
  red/black level-4 evolution costs 4; level-4 Greymon-name or ME/VB alternatives cost 3.
  Assembly -2 uses one level-4-or-lower Agumon/Greymon-name or ME/VB Digimon. It has
  Security Attack +1. Printed and inherited Decode may play a matching level-4-or-lower
  source when the host would leave other than by battle. On play/evolution it deletes one
  opposing Digimon with 6000 DP or less, then gives another opposing Digimon a next-main-phase
  mandatory attack through the end of that opponent's turn.
- **KB evidence:** Q6740 permits granting the delayed attack text to an unaffected Digimon,
  but the granted effect does not trigger if that Digimon is unaffected when the future timing
  arrives. Q6741 applies the level-4 ceiling to both sides of the Assembly OR. Decode follows
  the comprehensive other-than-battle replacement contract.
- **Corrections:** both Decode placements were label-only. Printed and inherited `AllTurns`
  replacements now play an eligible source for free with `playedByDecode:true` while allowing
  the host to leave. Future granted `SubTrigger` effects also lacked a live immunity gate; the
  interpreter now evaluates the recipient against the original Digimon/Option granter when the
  delayed trigger would fire, without preventing the text from being granted initially.
- **Ruling and behavioral proof:** the entry effect deletes the inclusive 6000-DP boundary and
  grants the distinct survivor its forced next-main attack. A recipient made unaffected after
  gaining that text neither suspends nor declares an attack at the timing, proving Q6740.
  BT1-010 satisfies Assembly through Agumon name, while level-5 VB EX12-014 is rejected,
  proving Q6741. Printed and buried EX12-016 each Decode a source before effect deletion; battle
  deletion plays nothing. Security Attack +1 and both On Play/When Digivolving paths are covered.
- **Evolution proof:** normal red EX12-011 and black BT10-061 pay 4; Greymon-name BT10-019 and
  off-color VB EX12-024 pay 3; off-color nonmatching BT1-069 is rejected.
- **Verification:** `EX12-016.test.ts` — 13/13; interpreter — 171/171; leave-prevention
  mechanism — 10/10; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-017 — WarGreymon — 10/10

- **Printed contract:** Red/black level 6 Dragonkin/ME/VB, play cost 12 and 12000 DP. Normal
  red/black level-5 evolution costs 4; level-5 Greymon-name or ME/VB alternatives cost 3.
  Its zero-cost DNA recipe accepts Red/Yellow level 5 plus Black/Purple level 5. Assembly -6
  requires matching level-5, level-4, and level-3 Agumon/Greymon-name or ME/VB cards. It has
  Security Attack +1 and Decode for matching level-5-or-lower sources. Its shared once-per-turn
  On Play/When Digivolving/When Attacking effect De-Digivolves 2, then deletes an opposing
  lowest-DP Digimon. Its independent once-per-turn Counter may DNA digivolve two own Digimon
  into an Omnimon-name or ME/VB card, then may redirect the attack to an own Digimon.
- **KB evidence:** Q6742 applies Decode's level-5 ceiling to both OR branches; Q6743 requires
  every one of Assembly's three level slots to satisfy the name/trait predicate. Q6744 removes
  the original target when that Digimon becomes DNA material. Q6745 permits only one Counter
  activation per attack. Q6746 permits the redirect even when the optional DNA does not occur.
- **Correction:** Decode was only an inert keyword marker. A real `AllTurns` other-than-battle
  replacement now optionally plays one matching level-5-or-lower source for free with
  `playedByDecode:true`, while the original host still leaves.
- **Behavioral proof:** the entry sequence peels exactly two real top cards before deleting the
  distinct lowest-DP Digimon, and a second timing in the shared group does nothing that turn.
  Effect deletion Decodes a level-5 Greymon-name source, battle deletion does not Decode, and a
  level-6 VB source is rejected. A player attack checks two security cards. All four DNA color
  recipes and a three-material Assembly play are preserved; independently invalid level-5,
  level-4, and level-3 materials are each rejected.
- **Counter and evolution proof:** a real Counter DNA merges the currently attacked Digimon into
  EX12-037, removes the old attack target, and rejects a second Counter response. With no legal
  DNA result, the same Counter still redirects the attack to the selected defender. Normal red
  BT1-020 and black BT10-064 pay 4; blue Greymon BT10-024 and yellow VB EX12-044 pay 3;
  off-color nonmatching BT1-038 is rejected.
- **Verification:** `EX12-017.test.ts` — 16/16; leave-prevention — 10/10; DNA mechanism — 1/1;
  attack/Counter conformance — 23/23; workspace typecheck, focused formatting, focused lint,
  and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-018 — Siriusmon / Planet Punch — 10/10

- **Printed contract:** Red/yellow level 6 Light Dragon/VB DUAL card, play/use cost 5 and
  12000 DP. Normal red/yellow level-5 evolution costs 4; level-5 Gammamon-text or VB
  alternatives cost 3. Siriusmon has Progress, Piercing, and Security Attack +1. Its shared
  once-per-turn When Digivolving/When Attacking effect may place up to two matching Digimon
  cards from hand/trash as top or bottom sources, then gives one opponent -2000 DP through
  their turn end per current source. Planet Punch has a VB use requirement; its Main deletes
  an opposing highest-DP Digimon, then one own Digimon may attack.
- **KB evidence:** Q6747 defines text matching across all printed card fields. Q6748 forbids a
  newly placed When Attacking inherited effect from joining the attack window already resolving.
  Q6749 likewise forbids Arts Digivolve into Siriusmon after Planet Punch's attack from opening
  a new When Attacking window.
- **Correction:** both PlaceUnder actions omitted the printed per-card top-or-bottom choice and
  always used one fixed stack position. They now carry `position:"choice"`; the shared
  PlaceUnder runner asks separately for every selected card and inserts it directly below the
  top or at the true bottom as chosen.
- **Digimon-side proof:** hand and trash cards are placed together and the DP reduction scales
  over the complete resulting stack. A Gammamon text-only card proves Q6747; no placement means
  no reduction. A manually selected bottom placement preserves the exact stack order. EX12-024
  placed during When Attacking does not draw from its newly gained inherited effect, proving
  Q6748. Progress and Piercing are live, and a winning Digimon battle performs two security
  checks through Security Attack +1.
- **Option/ruling proof:** an own blue/purple VB Digimon waives Planet Punch's red use
  requirement; an otherwise equivalent blue non-VB board is rejected. The highest-DP target is
  deleted and the accepted follow-up attacker declares a real attack, while declining the attack
  preserves the deletion. Planet Punch attacks with EX12-014, Arts Digivolves it into Siriusmon,
  resolves the When Digivolving placement, and records only the original attack, proving Q6749.
- **Evolution proof:** normal red AD1-003 and yellow AD1-015 pay 4; black Gammamon-text
  BT16-062 and blue/purple VB EX12-032 pay 3; blue nonmatching BT1-038 is rejected.
- **Verification:** `EX12-018.test.ts` — 14/14; interpreter — 171/171; advanced-keyword
  conformance — 30/30; Arts Digivolve/basic terminology — 48/48; workspace typecheck, focused
  formatting, focused lint, and `git diff --check` passed. The advanced-keyword Execute fixture
  now supplies defender security so game-over cannot preempt its asserted EndOfAttack deletion.
  No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-019 — Nezhamon — 10/10

- **Printed contract:** Red/black level 6 Cyborg/Saneiketsu/Tentei Hachibushu/Shambala/SW,
  play cost 12 and 12000 DP. Normal red/black level-5 evolution costs 4; level-5 Shambala
  costs 3. It has Rush, Collision, Piercing, Blocker, and Engage. Once per turn, whenever an
  attack target changes, it gains +4000 DP and immunity to opposing Digimon effects through
  the opponent's turn end. Independently once per turn, removal from either security stack
  lets it unsuspend.
- **KB evidence:** Q6750 establishes that a checked card's Security effect resolves immediately,
  before the turn player and then non-turn player order their other simultaneous triggers,
  including the generic security-stack-removal trigger.
- **Corrections:** the security watcher omitted a direction and inherited the interpreter's
  default “mine” gate despite the printed wording naming security stacks generically; it now
  carries `sourceFilter.controller:"any"`. Combat also published target-switch SubTriggers only
  for effect-driven RedirectAttack, whose payload itself omitted the attacker field required by
  self-scoped watchers. RedirectAttack now carries both subject and attacker identity, while Raid
  and declared blocks publish the same attacker-scoped event after a successful switch, so
  Nezhamon and every other printed target-change watcher see all three paths.
- **Behavioral proof:** own and opposing security removal each unsuspend Nezhamon, while a second
  event in the same turn does not. A target switch grants exactly +4000 once, blocks opposing
  Digimon effects, and still permits Option effects. In live combat, Collision makes a plain
  opposing Digimon block, that switch grants the bonus, the blocker loses, and Piercing removes
  security. Rush permits an attack on the play turn; all five printed keywords are live. Engage
  retains its executable optional end-of-turn self-attack and is additionally covered by the
  shared force-attack capability suite.
- **Evolution proof:** normal red AD1-003 and black BT10-064 pay 4; off-color Shambala EX12-029
  pays 3; blue non-Shambala BT1-038 is rejected.
- **Verification:** `EX12-019.test.ts` — 10/10; source-kind immunity — 9/9; interpreter
  capabilities (including Engage) — 289/289; Collision combat — 12/12; security-check ordering —
  11/11; combat controller — 23/23; combat primitives — 126/126; advanced keyword/Raid — 25/25;
  workspace typecheck, focused
  formatting, focused lint, and `git diff --check` passed. The Collision regression fixture now
  explicitly declines BT16-032's real target-switch end-attack effect before asserting its plain
  DP battle. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-020 — Gasamon — 10/10

- **Printed contract:** Blue level 3 Mollusk/Shambala/TB, play cost 3 and 2000 DP. Normal blue
  level-2 and alternate level-2 Shambala evolutions cost 0. During its controller's turn, when
  this Digimon would evolve into a TB Digimon, that evolution costs 1 less. Its inherited
  once-per-turn When Attacking draws 1 when its controller has 7 or fewer cards in hand.
- **KB evidence:** Q6751 confirms the cost-reduction effect does not trigger while Gasamon is in
  the breeding area, following the general rule that effects are inactive there.
- **Implementation trace:** the owner-turn effect installs a self-scoped `wouldDigivolve`
  replacement whose `into` filter requires a Digimon with exact TB trait; the nested replacement
  contributes a cost reduction of 1. The inherited Draw 1 carries the inclusive `handAtMost:7`
  condition and an independent once-per-turn use. The level-2 Shambala alternate requirement is
  exact. No correction was needed.
- **Behavioral proof:** Gasamon evolves into TB EX12-026 for 1 instead of 2, while non-TB
  EX12-025 pays its full cost and a neighboring Digimon receives no reduction. The same TB
  evolution from breeding pays full cost, proving Q6751. A buried Gasamon draws exactly once at
  seven cards; a separate eight-card hand draws nothing.
- **Evolution proof:** blue BT1-003 and off-color Shambala EX12-002 both evolve into Gasamon for
  0 through their respective routes; red non-Shambala BT1-001 is rejected.
- **Verification:** `EX12-020.test.ts` — 9/9; SubTrigger/cost-reduction registry — 23/23;
  digivolution action flow — 27/27; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-021 — Gabumon — 10/10

- **Printed contract:** Blue level 3 Reptile/VB Data Digimon, play cost 3 and 2000 DP. Normal
  blue level-2 evolution, Tsunomon-name evolution, and level-2 VB evolution all cost 0. At the
  start of its controller's main phase, the controller may trash one Garurumon-name or VB-trait
  card from hand to draw 1 and gain 1 memory. Its inherited once-per-turn When Attacking draws
  1 when its controller has 7 or fewer cards in hand.
- **KB evidence:** the committed knowledge base has no card-specific EX12-021 ruling. The audit
  therefore applies the printed “By trashing” activation contract, the inclusive hand threshold,
  and the standard evolution/name/trait matching rules directly.
- **Correction:** the leading Draw action had the exact trash filter and correctly gated the
  memory gain on successful payment, but it was mandatory. With exactly one eligible hand card,
  the engine discarded it automatically. The action now has `optional:true` and
  `abortOnDecline:true`, allowing the controller to decline the cost and stopping both outcomes.
- **Behavioral proof:** a VB-only Gammamon and a non-VB Garurumon separately pay the cost, draw
  exactly one, and gain exactly one memory while an unrelated hand card remains untouched.
  Declining preserves the eligible card, deck, trash, and memory; having no eligible hand card
  likewise produces no result. A buried Gabumon draws once at the inclusive seven-card boundary,
  cannot draw again that turn, and draws nothing when starting at eight cards.
- **Evolution proof:** blue BT1-003, purple Tsunomon BT11-006, and yellow VB EX12-001 each evolve
  into Gabumon for 0 through the normal, name, and trait routes respectively; red nonmatching
  BT1-001 is rejected. Catalog identity, stats, traits, printed text, exact IR filters, full
  coverage, and empty residuals are asserted.
- **Verification:** `EX12-021.test.ts` — 9/9; hand-trash cost mechanism — 2/2; interpreter —
  171/171; digivolution-candidate legality — 5/5; basic effect conformance — 8/8; digivolution
  action flow — 27/27; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-022 — Kamemon — 10/10

- **Printed contract:** Blue level 3 Cyborg/Shambala/SW Data Digimon, play cost 3 and 2000 DP.
  Normal blue level-2 and alternate level-2 Shambala evolutions cost 0. On play it reveals the
  top three cards, adds one Shambala card and one SW card among them, and returns the rest to the
  deck bottom. Its inherited once-per-turn When Attacking draws 1 when its controller has 7 or
  fewer cards in hand.
- **KB evidence:** the committed knowledge base has no card-specific EX12-022 ruling. The audit
  applies the two independently capped reveal slots, single-card identity, inclusive hand
  threshold, and standard alternate-evolution rules directly from the printed contract.
- **Implementation trace:** the On Play action has one three-card reveal with separate count-1
  Shambala and SW filters and `rest:"deckBottom"`; selected identities are removed between
  slots, so one dual-trait card cannot be added twice. The inherited Draw 1 has `handAtMost:7`
  and its own once-per-turn budget. The alternate evolution requires level 2 and Shambala
  together. No correction was needed.
- **Behavioral proof:** distinct Shambala-only and SW-eligible cards are both added while the
  unrelated third card returns to the bottom. With only one dual-trait card among the three, it
  enters hand exactly once and both unrelated cards return to the deck; with no matches, all
  three remain in the deck and none enter hand. A buried Kamemon draws once at seven cards,
  cannot draw a second time that turn, and draws nothing when starting at eight.
- **Evolution proof:** blue BT1-003 and off-color Shambala EX12-002 evolve into Kamemon for 0
  through their respective routes; red non-Shambala BT1-001 is rejected. Catalog identity,
  stats, traits, text, exact IR slots, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-022.test.ts` — 8/8; interpreter/reveal mechanics — 171/171;
  digivolution action flow — 27/27; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.
