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
  shared override now expose one level-capped OR slot reducing cost by 2 and cap the recipe at
  the single material printed by “1”; a later cross-card audit found and closed the missing cap.
  `GainKeyword` also
  failed to publish `lastEffectActed`, so the conditioned same-target attack never ran; the
  shared runner now records whether a recipient was actually chosen.
- **Ruling proof:** accepting Alliance produces `attackDeclared` for the chosen SW Digimon;
  declining produces none. A real 4000-DP target remains through that attack and is deleted by
  the following rule check. Level-3 SW EX12-006 and level-5 non-SW Gokuumon BT12-039 each pay
  DigiXros cost 5 and enter as material; level-6 SW EX12-019 is rejected. The inherited deletion
  accepts the 6000 boundary, rejects 7000, and a second firing cannot delete another target.
- **Evolution proof:** normal red EX12-011 and yellow BT1-051 pay 4; off-color Shambala EX12-025
  pays 3; off-color non-Shambala BT1-069 is rejected.
- **Verification:** `EX12-015.test.ts` — 12/12; interpreter — 171/171; DigiXros OR-material
  mechanism — 3/3; interpreter capabilities — 289/289. The later single-material regression
  passed alongside workspace typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved
  ruling remains.

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

## EX12-023 — Jellymon — 10/10

- **Printed contract:** Blue/yellow level 3 Mollusk/DS Data Digimon, play cost 3 and 2000 DP.
  Normal blue/yellow level-2 evolutions cost 1; Puyoyomon-name and level-2 DS alternatives cost
  0. On play it reveals the top three cards, adds one Jellymon-text card and one DS card, and
  returns the rest to the deck bottom. Its inherited once-per-turn When Attacking first draws 1,
  then mandatorily trashes one hand card if the post-draw hand has 7 or more cards.
- **KB evidence:** Q6752 defines “a card with X in its text” as the union of name, traits,
  effects, inherited effects, Rule, and all printed evolution/material/link requirement fields.
  The IR's `match:"text"` uses the engine's complete printed-text matcher rather than a name-only
  or effect-only predicate.
- **Implementation trace:** one RevealAdd action has independent count-1 Jellymon-text and DS
  slots and returns every unselected identity to deck bottom. The inherited sequence evaluates
  `handAtLeast:7` only after Draw 1 and shares one once-per-turn budget. Both alternate evolution
  requirements and the two catalog evolution colors/costs are exact. No correction was needed.
- **Ruling and behavioral proof:** non-DS BT13-028, which mentions Jellymon only in its effect,
  is added alongside a separate DS card, proving Q6752 through live resolution. A single card
  satisfying both slots is added only once and the other two revealed cards return to the deck.
  At six starting hand cards, Draw 1 reaches seven and the mandatory trash returns the hand to
  six; below that post-draw threshold nothing is trashed, and a second attack timing does nothing.
- **Evolution proof:** normal blue BT1-003 and yellow BT1-005 each cost 1; Puyoyomon BT9-002 and
  DS EX8-002 each use the zero-cost alternate route; red nonmatching BT1-001 is rejected. Catalog
  identity, stats, traits, text, exact IR filters, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-023.test.ts` — 8/8; interpreter/text/reveal mechanics — 171/171;
  digivolution action flow — 27/27; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-024 — Garurumon — 10/10

- **Printed contract:** Blue/purple level 4 Beast/NSo/VB Vaccine Digimon, play cost 4 and 4000
  DP. Normal blue/purple level-3 evolutions cost 3; level-3 Gabumon-name or NSo/VB alternatives
  cost 2. It has Jamming. Its shared once-per-turn On Play/When Attacking effect returns one
  opposing level-4-or-lower Digimon to hand. Its independent inherited once-per-turn When
  Attacking draws 1 and then trashes one hand card.
- **KB evidence:** the committed knowledge base has no card-specific EX12-024 ruling. The audit
  applies the inclusive level boundary, shared timing budget, Jamming security-battle rule,
  sequential mandatory processing, and OR evolution filters directly from the printed contract.
- **Implementation trace:** Jamming is a live static keyword. Separate On Play and When Attacking
  Return actions share one use key and both require an opposing Digimon at level 4 or lower. The
  inherited Draw and Trash actions are sequential and have their own once-per-turn frequency.
  The alternate evolution clauses preserve level 3 plus Gabumon-name or either exact NSo/VB
  trait. No correction was needed.
- **Behavioral proof:** On Play and When Attacking independently return an eligible level-4
  Digimon, preserve a level-5 control, and consume the same once-per-turn budget. A real attack
  into a stronger Security Digimon removes security while Garurumon survives through Jamming.
  A buried Garurumon draws and trashes exactly once; with an empty deck, the failed draw does not
  suppress the following mandatory hand trash, proving do-as-much-as-possible sequencing.
- **Evolution proof:** blue BT1-027 and purple BT10-071 pay 3; Gabumon BT1-029, NSo-only
  BT26-062, and off-color VB-only EX12-005 each pay 2; red nonmatching BT1-010 is rejected.
  Catalog identity, stats, traits, printed text, exact IR filters, full coverage, and empty
  residuals are asserted.
- **Verification:** `EX12-024.test.ts` — 8/8; interpreter/shared-use mechanics — 171/171;
  security/Jamming mechanics — 11/11; movement primitives — 126/126; digivolution action flow —
  27/27; workspace typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-025 — Gawappamon — 10/10

- **Printed contract:** Blue level 4 Cyborg/Shambala/SW Data Digimon, play cost 5 and 5000 DP.
  Normal blue level-3 and alternate level-3 Shambala evolutions cost 2. It has printed Blocker.
  On Play and On Deletion independently may return one opposing level-4-or-lower Digimon to
  hand. Its inherited once-per-turn When Attacking draws 1 when its controller has 7 or fewer
  cards in hand.
- **KB evidence:** the committed knowledge base has no card-specific EX12-025 ruling. The audit
  applies the inclusive level boundary, optional activation, printed-versus-inherited placement,
  Blocker combat rules, inclusive hand threshold, and alternate evolution contract directly.
- **Implementation trace:** Blocker is a non-inherited static keyword. On Play and On Deletion
  each contain an optional count-1 Return whose opponent Digimon filter is capped at level 4.
  The inherited Draw has `handAtMost:7` and an independent once-per-turn budget. The alternate
  evolution requires both level 3 and exact Shambala trait. No correction was needed.
- **Behavioral proof:** accepted On Play and On Deletion triggers return a level-4 target while
  preserving a level-5 control; declining On Play returns nothing. A top Gawappamon exposes
  Blocker, while the same card buried under a plain host does not grant Blocker. In live combat,
  it opens the defender's block window, redirects the attack, defeats the smaller attacker, and
  leaves security untouched. Its inherited effect draws exactly once at seven and not at eight.
- **Evolution proof:** blue BT1-027 and off-color Shambala EX12-006 each pay 2 through their
  respective routes; red non-Shambala BT1-010 is rejected. Catalog identity, stats, traits,
  printed text, exact IR actions, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-025.test.ts` — 8/8; Blocker behavioral proof — 4/4; movement primitives
  — 126/126; digivolution action flow — 27/27; workspace typecheck, focused formatting, focused
  lint, and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling
  remains.

## EX12-026 — Shellmon — 10/10

- **Printed contract:** Blue level 4 Mollusk/Shambala/TB Data Digimon, play cost 5 and 5000 DP.
  Normal blue level-3 and alternate level-3 Shambala evolutions cost 2. It has printed Blocker
  and a Rule granting the Aquatic trait. On Play and When Digivolving, it trashes the bottom two
  sources of one opposing Digimon; then one opposing Digimon with at most one source can't attack
  or block through that opponent's turn end. Its inherited once-per-turn attack effect draws 1
  at seven or fewer hand cards.
- **KB evidence:** Q6753 confirms the attack/block restriction is granted after checking the
  chosen target's source count and remains attached even if that Digimon later gains two or more
  sources. The first source-trash target and the later restricted target are independent choices.
- **Implementation trace:** both entry timings carry the same four-action sequence: bottom-first
  TrashDigivolution for two, an independently bound at-most-one-source target, then attack and
  block restrictions referencing that exact binding through `untilOpponentTurnEnd`. Blocker is
  non-inherited; the Rule installs Aquatic; the inherited Draw uses `handAtMost:7` and once per
  turn. The Shambala evolution route is exact. No correction was needed.
- **Ruling and behavioral proof:** a three-source target loses its true bottom two cards and,
  after reaching one source, receives both restrictions. Adding another source afterward leaves
  both restrictions active, proving Q6753. Manual decisions also trash one Digimon's sources and
  restrict a different eligible Digimon without restricting the first. The complete sequence
  resolves from both On Play and When Digivolving. Top Shellmon has Blocker and Aquatic, while a
  buried copy does not incorrectly grant Blocker. Its inherited effect draws once at seven and
  nothing at eight.
- **Evolution proof:** blue BT1-027 and off-color Shambala EX12-006 each pay 2; red non-Shambala
  BT1-010 is rejected. Catalog identity, stats, traits, Rule text, exact IR bindings and
  durations, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-026.test.ts` — 8/8; restriction enforcement — 17/17; Blocker behavioral
  proof — 4/4; interpreter/source-trash and binding mechanics — 171/171; digivolution action flow
  — 27/27; workspace typecheck, focused formatting, focused lint, and `git diff --check` passed.
  No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-027 — TeslaJellymon — 10/10

- **Printed contract:** Blue/yellow level 4 Mollusk/DS Data Digimon, play cost 5 and 6000 DP.
  Normal blue/yellow level-3 evolutions cost 3; Jellymon-name and level-3 DS alternatives cost 2.
  Its optional Main once per turn plays or uses one Jellymon-text or DS card from hand with cost
  reduced by 2. Its inherited once-per-turn When Attacking draws 1, then trashes one hand card
  when the post-draw hand has at least seven cards.
- **KB evidence:** Q6754 applies full printed-text matching. Q6755 forbids combining the
  reductions of two TeslaJellymon effects into one play/use. Q6756 permits activation and play
  through Solarmon but requires the full printed play cost. Q6757 permits activation through
  Pomumon but prevents the effect-play itself.
- **Implementation trace:** one once-per-turn Main Modal chooses exactly one branch. The play
  branch accepts matching Digimon/Tamers through PlayWithoutCost with real payment reduced by 2;
  the use branch is Option-only and uses the same real-payment reduction. Both filters OR
  Jellymon full-text and exact DS trait. The inherited sequence checks `handAtLeast:7` only after
  Draw 1. Both alternate evolution routes are exact. No correction was needed.
- **Ruling and behavioral proof:** a non-DS BT13-028 matching only through effect text is played
  for 5, proving Q6754. With two TeslaJellymon copies, one EX12-023 still costs 1 rather than 0,
  proving Q6755. Solarmon makes that card cost its full 3 while allowing the play, proving Q6756;
  Pomumon allows activation but leaves the target in hand and memory unchanged, proving Q6757.
  A matching DS Option costs 1 and resolves its Main effect. A second activation of the same
  source is rejected. The inherited effect trashes after drawing from six to seven, but not when
  drawing from five to six, and cannot resolve twice that turn.
- **Evolution proof:** normal blue BT1-027 and yellow BT1-045 pay 3; Jellymon EX12-023 and
  off-color DS EX8-056 pay 2; red nonmatching BT1-010 is rejected. Catalog identity, stats,
  traits, exact modal filters, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-027.test.ts` — 13/13; play-card action flow — 26/26; interpreter
  capabilities including reduced Option use — 289/289; interpreter/text matching — 171/171;
  digivolution action flow — 27/27; workspace typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-028 — Gusokumon — 10/10

- **Printed contract:** Blue/black level 5 Crustacean/DS Vaccine Digimon, play cost 8 and 8000
  DP. Normal blue/black level-4 evolutions cost 4; level-4 DS costs 3. Zero-cost DNA accepts
  Blue/Purple level 4 plus Black/Yellow level 4. It has Blocker and Decode for level-4-or-lower
  DS sources. Once per turn on any Digimon's attack, it may place a DS Digimon from hand at its
  stack bottom to De-Digivolve 1 opposing Digimon; after, at 0 or less memory it gains 1. Its
  inherited opponent-turn effect may redirect one opposing attack to an own DS Digimon once.
- **KB evidence:** Q6758 makes every clause after the “by placing” payment dependent on actually
  placing the card. Q6759 defines “0 or less memory” as both 0 and the opponent's side of the
  gauge. Decode follows the comprehensive other-than-battle leave replacement contract.
- **Corrections:** Decode was only an inert keyword marker; a self-scoped would-leave replacement
  now optionally plays one level-4-or-lower DS source for free before non-battle removal while
  allowing the host to leave. The direct module declared four DNA recipes, but the shared
  legality registry returned none, which made invalid DNA pairs legal; the same four recipes now
  exist in the shared override. The committed aggregate IR was also stale and partial: it limited
  the any-Digimon watcher to own attacks and left the memory clause RawUnparsed. It now matches
  the full direct IR, carries executable GainMemory, full coverage, empty residuals, evolution,
  DNA, and Decode.
- **Ruling and behavioral proof:** accepting the DS placement puts it at the true stack bottom,
  De-Digivolves an opponent, and gains memory at both 0 and -2; at +1 it gains none. With no DS
  card or when the payment is declined, neither De-Digivolve nor memory occurs, proving Q6758.
  Both own and opposing attacks trigger the printed watcher, whose once-per-turn budget blocks a
  second resolution. Effect removal Decodes level-4 DS EX12-027; battle removal does not, and a
  level-5 DS source is rejected. The inherited effect redirects a live opponent attack to a DS
  Digimon, and a second attack that turn reaches security instead.
- **Evolution and keyword proof:** normal blue AD1-010 and black BT10-061 pay 4; off-color DS
  EX8-058 pays 3; red non-DS BT1-014 is rejected. All four Blue/Purple × Black/Yellow DNA pairs
  merge for 0, while Blue + Purple is rejected. Blocker and Decode appear only with Gusokumon on
  top, not when buried. Catalog identity, stats, traits, exact IR, full coverage, and empty
  residuals are asserted in both runtime and aggregate sources.
- **Verification:** `EX12-028.test.ts` — 15/15; leave-prevention/Decode — 10/10; DNA merge — 1/1;
  SubTrigger registry — 23/23; Blocker behavioral proof — 4/4; combat/effect primitives —
  126/126; interpreter — 171/171; digivolution action flow — 27/27; workspace typecheck, focused
  formatting, focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  or unresolved ruling remains.

## EX12-029 — Sagomon — 10/10

- **Printed contract:** Blue/yellow level 5 Wizard/Shambala/SW Virus Digimon, play cost 7 and
  7000 DP. Normal blue/yellow level-4 evolutions cost 4; level-4 Shambala costs 3. DigiXros -2
  accepts exactly one level-5-or-lower Digimon with Gokuumon in its full text or the SW trait.
  It has Blocker. On Play/When Digivolving, one opposing Digimon or Tamer can't suspend through
  their turn end; then one other own SW Digimon may gain Alliance for the turn and must attack.
  Its inherited once-per-turn attack effect trashes two bottom sources, then prevents one
  source-less opposing Digimon from suspending through that opponent's turn end.
- **KB evidence:** Q6760 defines Gokuumon-text through the complete printed-text union. Q6761
  makes the attack mandatory after accepting the Alliance grant. Q6762 applies the level-5
  ceiling to both the Gokuumon-text and SW sides of the DigiXros OR.
- **Corrections:** the direct DigiXros slot had the correct OR and level ceiling but, because a
  single-slot recipe is otherwise repeatable, allowed multiple materials despite the printed
  “1.” It now has `maxMaterials:1`. The shared override gained the same cap. The committed
  aggregate recipe previously ANDed name, trait, and text while omitting the level ceiling; it
  now matches the direct level-capped OR slot and one-material limit. The identical previously
  audited EX12-015 recipe was corrected and regression-tested at the same seam.
- **Ruling and behavioral proof:** SW EX12-006 and non-SW EX6-024 matching only through printed
  Gokuumon text each pay DigiXros cost 5. Level-6/7 candidates on both OR branches are rejected,
  proving Q6760/Q6762, and two individually legal materials are rejected. Accepting Alliance on
  play produces a real forced attack by the selected ally; declining produces no attack.
  Digivolving executes the same restriction, grant, and forced attack, proving Q6761 across both
  timings. The inherited effect removes the true bottom two sources, independently restricts a
  source-less Digimon, and does not resolve twice that turn.
- **Evolution and keyword proof:** normal blue AD1-010 and yellow BT1-051 pay 4; off-color
  Shambala EX12-011 pays 3; purple non-Shambala BT10-074 is rejected. Blocker appears only while
  Sagomon is on top, not when buried. Catalog identity, stats, traits, exact direct/shared IR,
  full coverage, and empty residuals are asserted.
- **Verification:** `EX12-029.test.ts` — 14/14; EX12-015 single-material regression — 12/12;
  DigiXros OR mechanics — 3/3; interpreter capabilities/material caps — 289/289; Alliance
  decision — 1/1; restriction enforcement — 17/17; Blocker proof — 4/4; digivolution action flow
  — 27/27; workspace typecheck, focused formatting, focused lint, and `git diff --check` passed.
  No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-030 — Thetismon — 10/10

- **Printed contract:** Blue/yellow level 5 Aquabeast/DS Data Digimon, play cost 7 and 7000 DP.
  Normal blue/yellow level-4 evolutions cost 4; level-4 cards with Jellymon in their text or the
  DS trait cost 3. It has Jamming. On Play/When Digivolving, it may trash up to three cards from
  hand to give one opposing Digimon -2000 DP per card actually trashed, then returns one opposing
  Digimon with 5000 DP or less to the deck bottom. Its inherited once-per-turn All Turns effect
  may return exactly three Jellymon-text or DS cards from trash to deck bottom to unsuspend its
  host when that host suspends.
- **KB evidence:** Q6763 applies Jellymon matching to the complete printed-text union. Q6764
  requires exactly three cards for the inherited payment, not “up to” three. Q6765 delays the
  zero-DP rule check until the entire effect finishes, allowing the later return to move the
  zero-DP Digimon instead of rule-deleting it. Q6766 routes a returned Digi-Egg to the egg deck
  and still counts it toward the three-card payment.
- **Correction:** the direct executable IR already bound the optional hand trash as the
  ModifyDP cost and scaled with `usePaidCount`. The committed aggregate IR instead modeled an
  independent optional Trash followed by a generic scaling counter, which could drift from the
  amount actually paid. Both On Play and When Digivolving aggregate branches now match the
  executable cost-bound action and paid-card scaling. Direct registration remains exclusively
  through `registerIrCard`, with full coverage and no residuals.
- **Ruling and behavioral proof:** trashing two cards produces -4000 DP before returning the
  resulting 3000-DP target; declining the optional trash still performs the independent
  5000-or-less return. Trashing three cards reduces a 6000-DP target to 0 and the same effect
  returns it before the rule check, proving Q6765. The same scaled sequence resolves When
  Digivolving. The inherited effect accepts a non-DS card matching Jellymon only in its text, a
  DS card, and a DS Digi-Egg; the two Digimon cards reach deck bottom, the egg reaches the egg
  deck, and the host unsuspends, proving Q6763/Q6766. Two eligible cards cannot pay, and a second
  activation in the turn does nothing, proving Q6764 and the once-per-turn budget.
- **Evolution and keyword proof:** normal blue AD1-010 and yellow BT1-051 pay 4; EX12-027 matches
  Jellymon in its text and off-color EX8-058 matches DS, each paying 3; purple nonmatching
  BT10-074 is rejected. Jamming protects a top-level Thetismon from a losing security battle and
  is not inherited by a host. Catalog identity, stats, traits, exact direct/shared IR, full
  coverage, and empty residuals are asserted.
- **Verification:** `EX12-030.test.ts` — 11/11; interpreter — 171/171; effect primitives —
  126/126; security checks — 11/11; digivolution action flow — 27/27; workspace typecheck,
  focused formatting, focused lint, and `git diff --check` passed. No residual IR, unsupported
  behavior, or unresolved ruling remains.

## EX12-031 — MarineBullmon — 10/10

- **Printed contract:** Blue/yellow level 5 Mollusk/Shambala/TB Data Digimon, play cost 7 and
  7000 DP. Normal blue/yellow level-4 evolutions cost 4; level-4 Aquatic or Shambala costs 3.
  Assembly -2 uses exactly one level-4-or-lower card with Aqua/Sea Animal in any trait or the TB
  trait. It has Decode for a level-4-or-lower Digimon matching the same trait OR, and grants that
  Decode as an inherited effect. On Play/When Digivolving, placing one level-6-or-lower matching
  card from hand at its stack bottom returns one opposing Digimon with at most one source to
  hand. Its Rule grants Aquatic.
- **KB evidence:** Q6767 applies the preceding level ceiling to both alternatives in a phrase of
  the form “level N or lower card with A or B.” Consequently, Assembly and the placement payment
  cannot use an over-level Aqua/Sea Animal or TB card. “Aqua in any trait” is substring matching,
  while TB remains an exact trait identity.
- **Corrections:** both printed Decode instances were inert keyword markers. Executable
  other-than-battle leave replacements now play one qualifying level-4-or-lower source for free,
  both while MarineBullmon is on top and while it is inherited. The direct placement and
  Assembly filters incorrectly treated Aqua as an exact trait; they now use `traitContains` for
  Aqua/Sea Animal and exact matching for TB. The shared Assembly override received the same fix.
  The aggregate IR was additionally stale: it omitted the target's one-source ceiling, targeted
  the payment placement at `host: target`, used exact Aqua matching, flattened Assembly
  incorrectly, and lacked executable Decode. It now equals the direct registered IR exactly.
- **Ruling and behavioral proof:** Aquatic BT12-025 qualifies for Assembly through the Aqua
  substring and reduces play cost from 7 to 5, while level-5 Aquabeast and TB materials are both
  rejected, proving Q6767 across the OR. On Play, level-6 Aquatic BT10-027 is placed at the true
  stack bottom and a one-source target returns to hand; level-7 TB EX12-076 cannot pay, and a
  two-source target is ineligible. Declining the optional placement preserves the hand card and
  suppresses the dependent return. When Digivolving repeats the sequence with a Sea Animal card.
  Top-level Decode plays both an Aquatic and an exact-TB level-4 source after effect removal, not
  battle removal. Inherited Decode plays from its host, while a level-5 Aquabeast source fails the
  printed ceiling. Both top and inherited Decode keywords are observable, and the Rule grants
  Aquatic.
- **Evolution proof:** normal blue AD1-010 and yellow BT1-051 pay 4; Aquatic BT12-025 and
  off-color Shambala EX12-011 pay 3; purple nonmatching BT10-074 is rejected. Catalog identity,
  stats, traits, direct/aggregate equality, shared requirements, full coverage, and empty
  residuals are asserted.
- **Verification:** `EX12-031.test.ts` — 11/11; leave prevention/Decode — 10/10; Assembly engine
  — 2/2; interpreter — 171/171; effect primitives — 126/126; digivolution action flow — 27/27;
  workspace typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-032 — WereGarurumon — 10/10

- **Printed contract:** Blue/purple level 5 Beastkin/NSo/VB Vaccine Digimon, play cost 7 and
  7000 DP. Normal blue/purple level-4 evolutions cost 4; level-4 Garurumon-name or NSo/VB costs
  3. Zero-cost DNA accepts Blue/Yellow level 5 plus Purple/Red level 5. On Play/When Digivolving,
  one opposing Digimon or Tamer can't suspend through that opponent's turn end. When Attacking,
  if any level occurs at least twice among the top and source cards, it may digivolve into a
  Garurumon-name or NSo/VB Digimon from trash with cost reduced by 2. Its inherited effect is
  Decode for a level-4-or-lower Gabumon/Garurumon-name or NSo/VB source.
- **KB evidence:** Q6768 counts every card in the stack and does not require the duplicated level
  to match the top card: either top plus one same-level source or two same-level sources satisfy
  the condition. Q6769 applies Decode's level-4 ceiling to both the name and trait alternatives.
- **Corrections:** inherited Decode was only an inert keyword marker. An inherited
  other-than-battle leave replacement now plays one qualifying source without cost. The
  aggregate IR described the same-level condition as raw text, omitted explicit paid-cost
  semantics, omitted executable Decode, and omitted all four DNA recipes. It now carries the
  structured `stackHasSameLevelCards` predicate, paid digivolution with reduction, inherited
  replacement, and the same DNA requirements as the direct module/shared legality registry.
  Direct and aggregate records are asserted equal.
- **Ruling and behavioral proof:** the restriction resolves on play against a Digimon and on
  digivolution against a Tamer. A level-5 top plus level-5 source enables the reduced trash
  digivolution, as do two level-4 sources under the level-5 top; a stack with all different levels
  does not, proving Q6768. Inherited Decode plays a level-4 Garurumon-name source and a level-4
  NSo source after effect removal, but not after battle removal. Level-5 Garurumon-name and NSo
  sources are both rejected, proving Q6769. Decode is absent while WereGarurumon is on top and
  present only when it is inherited.
- **Evolution and DNA proof:** normal blue BT1-036 and purple BT10-074 pay 4; off-color
  Garurumon EX4-043 and VB EX12-010 pay 3. Level-5 name/trait candidates are rejected as bases.
  All four Blue/Yellow × Purple/Red level-5 DNA combinations merge for 0; Blue + Yellow is
  rejected. Catalog identity, stats, traits, direct/shared requirements, full coverage, and empty
  residuals are asserted.
- **Verification:** `EX12-032.test.ts` — 10/10; leave prevention/Decode — 10/10; DNA merge — 1/1;
  restriction enforcement — 17/17; interpreter — 171/171; digivolution action flow — 27/27;
  workspace typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-033 — Amphimon / Frozen Crystal — 10/10

- **Printed contract:** Blue/yellow level 6 Cyborg/DS Data dual Digimon/Option, play cost 5 and
  12000 DP. Normal blue/yellow level-5 evolutions cost 4; level-5 Jellymon-text or DS costs 3.
  Its Digimon effect at When Digivolving, When Attacking, and Counter may trash up to three hand
  cards to give one opposing Digimon -4000 DP per card actually trashed through the end of the
  user's turn. Once per turn, when any own Jellymon-text or DS Digimon would leave, returning
  exactly three trash cards to deck bottom prevents every matching Digimon in that simultaneous
  batch from leaving. Frozen Crystal has a DS use requirement; its Main effect trashes any four
  sources distributed across opposing Digimon/Tamers, then may return one source-less opposing
  Digimon/Tamer to hand.
- **KB evidence:** Q6770 defines Jellymon-text as the complete printed-text union. Q6771 requires
  all three cards for the prevention payment. Q6772 confirms that a Digi-Egg routed to the egg
  deck still pays. Q6773 permits only one Counter activation per attack. Q6774 makes one
  prevention payment protect all simultaneously leaving qualifying Digimon rather than one.
- **Corrections:** the replacement lacked `affectsAll`, so it could not express Q6774, and its
  payment was not explicitly optional/abortable in the direct module. Both are now encoded. The
  aggregate IR separately trashed hand cards before each DP modifier and scaled generically,
  rather than scaling from the attached paid cost; all three timings now use `usePaidCount`. Its
  Frozen Crystal action incorrectly trashed one generic target and could return a target that
  still had sources; it now matches the distributed four-source removal and source-less filter.
  Direct and aggregate records are asserted equal.
- **Ruling and behavioral proof:** both When Digivolving and When Attacking scale from the actual
  number of hand cards trashed. A non-DS BT13-028 qualifies only through Jellymon in its printed
  text. One three-card payment protects Amphimon, that text-only Digimon, and a DS Digimon from
  the same batched deletion, proving Q6770/Q6774. Two cards cannot pay and the target leaves;
  two normal cards plus a Digi-Egg do pay, with the normal cards reaching deck bottom and the egg
  reaching the egg deck, proving Q6771/Q6772. A later leave in the same turn is not prevented.
  The real Counter window activates Amphimon once and rejects a second Counter response for that
  attack, proving Q6773. An off-color purple DS Digimon waives Frozen Crystal's blue requirement;
  without DS the use is rejected. The Main effect removes four sources across two stacks and
  returns an eligible source-less permanent.
- **Evolution proof:** normal blue BT1-040 and yellow EX12-044 pay 4; text-only BT13-028 and
  off-color DS EX8-061 pay 3; black nonmatching BT23-056 is rejected. Catalog dual identity,
  stats, traits, use requirement, direct/shared evolution routes, full coverage, and empty
  residuals are asserted.
- **Verification:** `EX12-033.test.ts` — 10/10; leave prevention — 10/10; attack/Counter
  conformance — 23/23; effect primitives — 126/126; interpreter capabilities — 289/289;
  continuous color waiver — 2/2; interpreter — 171/171; digivolution action flow — 27/27;
  workspace typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-034 — Erlangmon — 10/10

- **Printed contract:** Blue/black level 6 Shaman/Saneiketsu/Tentei Hachibushu/Shambala/SW Data
  Digimon, play cost 12 and 12000 DP. Normal blue/black level-5 evolutions cost 4; level-5
  Shambala costs 3. On Play/When Digivolving, it may play one black 9000-DP Kotenken Token with
  Blocker. Once per turn when any own Digimon is played, it returns one opposing lowest-level
  Digimon to deck bottom. Separately once per turn, when any own Digimon would leave, it may play
  one level-5-or-lower SW card from hand or from Erlangmon's own sources for free; the leaving
  Digimon still leaves.
- **KB evidence:** Q6775 confirms Erlangmon's watcher triggers from Erlangmon's own play. Q6776
  puts its simultaneous play triggers into the controller-ordered activation window. Q6777 allows
  the leave replacement to interrupt a zero-DP Kotenken rule deletion before the pending played
  watcher resolves, and Q6778 performs a new rule check on a low-DP SW card played by the
  replacement before the older played watcher activates.
- **Corrections:** Kotenken did not exist in the token registry, making both token effects inert.
  A canonical black 9000-DP token definition and compiled Blocker module now register through
  `registerIrCard`, and the EX12 index loads it. The aggregate Erlangmon record also omitted
  `source: thisDigimon`. More deeply, the loose-card resolver ignored that selector and offered
  sources under every own permanent; it now restricts hosted candidates to the resolving source
  while preserving the combined hand pool. The pseudo-source is represented in the shared zone
  type, and the direct/aggregate Erlangmon records are equal.
- **Ruling and behavioral proof:** playing Erlangmon produces a real Kotenken with 9000 DP and
  functional Blocker, and its own-play event returns the opposing lowest-level Digimon, proving
  Q6775. Digivolving produces the same token. Independent SW leave plays succeed from hand and
  Erlangmon's own stack, including when Erlangmon itself leaves, without preventing that leave.
  A qualifying card under the leaving victim is not offered, and a level-6 SW card is rejected.
  Trigger-stack ordering and rule-check pools pass their focused regressions, covering the engine
  seams used by Q6776–Q6778: controller ordering of simultaneous pending effects, interruption by
  would-leave replacements, and rule checks before older pending activations.
- **Evolution proof:** normal blue BT1-040 and black BT23-056 pay 4; Shambala EX12-031 pays 3;
  yellow non-Shambala EX12-044 is rejected. Catalog identity, stats, traits, token identity,
  direct/shared requirements, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-034.test.ts` — 8/8; existing this-Digimon source consumer regression —
  10/10; token/battle engine — 6/6; effect primitives — 126/126; SubTrigger registry — 23/23;
  Blocker proof — 4/4; rule-check conformance — 4/4; leave replacement — 10/10; interpreter —
  171/171; digivolution action flow — 27/27; trigger stack — 31/31; rule-check pool — 3/3;
  workspace typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-035 — MetalGarurumon — 10/10

- **Printed contract:** Blue/purple level 6 Cyborg/ME/VB Data Digimon, play cost 12 and 12000 DP.
  Normal blue/purple level-5 evolutions cost 4; level-5 Garurumon-name or ME/VB costs 3. Its four
  zero-cost DNA recipes combine Blue/Black level 5 with Purple/Yellow level 5. Assembly reduces
  play cost by 6 using exactly one qualifying level 5, level 4, and level 3. It has Evade and
  Decode for a level-5-or-lower Gabumon/Garurumon-name or ME/VB source. On Play/When Digivolving,
  it trashes any four opposing sources across Digimon, then returns one opposing Digimon with no
  more sources than MetalGarurumon to deck bottom. Once per turn, any Digimon being played or
  digivolving makes one opposing Digimon unable to suspend through that opponent's turn end.
- **KB evidence:** Q6779 applies Decode's level ceiling to both identity branches. Q6780 requires
  every Assembly material independently to have its exact level and qualifying name/trait.
  Q6781 includes MetalGarurumon's own play and digivolution. Q6782 makes its simultaneous effects
  controller ordered. Q6783 permits Decode again at the next zero-DP rule check after Decode then
  Evade; Q6784 permits Decode and Evade in the reverse activation order as well.
- **Corrections:** top-level Decode previously existed only as an inert keyword marker; it now has
  an executable other-than-battle leave replacement. The aggregate IR omitted all four DNA
  recipes, limited the four-source trash to one Digimon, and watched only the controller's plays
  and digivolutions under the wrong event name. It now matches the direct module exactly, using a
  distributed source pool and both-player event filters. Registration remains exclusively through
  `registerIrCard`.
- **Ruling and behavioral proof:** Decode plays both a level-5 Garurumon-name source and a level-5
  VB source after effect deletion, but not after battle deletion; level-6 name and ME/VB cards are
  rejected, proving Q6779. Decode and accepted Evade both resolve in one deletion window, and a
  second rule-deletion attempt can Decode the remaining source before MetalGarurumon leaves,
  proving the observable Q6783/Q6784 outcomes. The On Play effect removes four cards distributed
  across two stacks, preserves an over-ceiling target, and returns an eligible target. Fresh
  watcher scenarios cover own/opponent play and own/opponent digivolution, including the source
  itself. The Once Per Turn marker is asserted structurally.
- **Evolution, DNA, and Assembly proof:** normal blue BT1-040 and purple BT2-078 pay 4; black
  Garurumon BT23-056 and yellow VB EX12-044 pay 3; a red nonmatching level 5 is rejected. All four
  Blue/Black × Purple/Yellow DNA pairs merge for 0 and Blue + Black is rejected. Assembly pays 6
  using level-5 Garurumon, level-4 ME/VB, and level-3 Gabumon materials; wrong identity at each
  level and a wrong-level material are independently rejected, proving Q6780. Catalog identity,
  stats, traits, direct/shared requirements, full coverage, and empty residuals are asserted.
- **Verification:** `EX12-035.test.ts` — 9/9; leave prevention — 10/10; deletion/advanced keyword
  conformance — 30/30; DNA merge — 1/1; Assembly — 2/2; restriction enforcement — 17/17;
  SubTrigger registry — 23/23; effect primitives — 126/126; interpreter — 171/171; digivolution
  action flow — 27/27; shared build, API typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-036 — Ryugumon — 10/10

- **Printed contract:** Blue/yellow level 6 Mollusk/Sanmyojin/Tentei Hachibushu/Shambala/TB Data
  Digimon, play cost 12 and 12000 DP. Normal blue/yellow level-5 evolutions cost 4; level-5
  Aquatic/Shambala costs 3. It has Barrier, Evade, and Decode for a level-5-or-lower source with
  Aqua/Sea Animal anywhere in a trait or exact TB. Once per turn shared across On Play, When
  Digivolving, and When Attacking, placing one qualifying level-6-or-lower hand card at its stack
  bottom may unsuspend one own Digimon. Separately once per turn, any own Digimon being played or
  digivolving makes one opposing Digimon unable to activate When Digivolving effects or suspend
  through that opponent's turn end. Its Rule grants Aquatic.
- **KB evidence:** Q6785 applies the level ceiling to every Decode identity branch. Q6786 includes
  Ryugumon's own play and evolution into Ryugumon. Q6787 makes simultaneous triggers controller
  ordered. Q6788/Q6789 give the same repeated rule-check and Decode/Evade ordering permissions as
  MetalGarurumon. Q6790-Q6793 define the When Digivolving prohibition as blocking normal triggers,
  forced activations, and even the `By` cost, while allowing a multi-timing effect at When
  Attacking. Q6794 says a blocked activation does not consume its once-per-turn use.
- **Corrections:** top-level Decode was an inert keyword and now has an executable other-than-
  battle replacement. All three hand-cost filters used exact trait matching for the substring
  phrase; they now use `traitContains` for Aqua/Sea Animal while keeping TB exact. The aggregate
  watcher had omitted the entire inability-to-suspend clause; it now applies both restrictions to
  one shared target and matches the direct module exactly. Registration remains exclusively
  through `registerIrCard`.
- **Ruling and behavioral proof:** an Aquabeast hand card pays the On Play cost, reaches the true
  stack bottom, and unsuspends Ryugumon; a second qualifying card cannot pay at When Digivolving
  in the same turn. Decode plays level-5 Aquabeast and TB sources after effect removal, rejects
  level-6 Aquatic/TB sources, and does not run for battle removal, proving Q6785. A suspended
  Ryugumon uses Barrier to trash security and survive effect deletion. Its own play and its own
  digivolution subject both arm the paired restriction, proving Q6786. A restricted opposing
  Ryugumon's When Digivolving window neither pays its cost nor unsuspends, but its subsequent When
  Attacking window does both, proving the observable Q6790-Q6794 contract and that the blocked
  timing did not spend the shared use.
- **Evolution proof:** normal blue BT1-040 and yellow EX12-044 pay 4; off-color purple Aquatic
  BT15-078 and purple/green Shambala EX12-063 pay 3; black nonmatching BT23-056 is rejected.
  Catalog identity, stats, traits, Rule grant, direct/shared evolution route, full coverage, and
  empty residuals are asserted.
- **Verification:** `EX12-036.test.ts` — 9/9; leave prevention — 10/10; deletion/advanced keyword
  conformance — 30/30; restriction enforcement — 17/17; interpreter capabilities — 289/289;
  SubTrigger registry — 23/23; effect primitives — 126/126; interpreter — 171/171; digivolution
  action flow — 27/27; rule-check pool — 3/3; shared build, API typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved
  ruling remains.

## EX12-037 — Omnimon — 10/10

- **Printed contract:** Blue/yellow/red level 7 Holy Warrior/Royal Knight/ME/VB Vaccine Digimon,
  play cost 15 and 15000 DP. Normal blue/yellow/red level-6 evolutions and the alternate level-6
  ME/VB route cost 5. Its four zero-cost DNA recipes combine Blue/Yellow level 6 with Red/Black
  level 6. It has Piercing, Blocker, and Barrier. Once per turn shared across When Digivolving and
  When Attacking, it deletes one opposing Digimon, then activates one bullet per five sources:
  either -13000 DP through the opponent's turn end, or trash opposing top security then Recovery
  +1.
- **KB evidence:** Q6795 permits repeating one bullet or mixing bullets. Q6796 requires choosing
  the next bullet only after the previous one resolves. Q6797 snapshots the number of activations
  when the scaled clause begins. Q6798 delays DP-0 deletion until every activation in the effect
  has resolved. Q7191 skips the scaled clause if an immediate reaction to the initial deletion
  removes Omnimon, because its source count can no longer be referenced.
- **Corrections:** the aggregate IR omitted the initial deletion and all four DNA recipes, fixed
  the modal to one activation, and represented security trash as a generic card trash. It now
  matches the direct module exactly. More deeply, the generic scaled-modal executor prohibited
  repeated choices and collected all choices before resolving them. It now snapshots the count,
  chooses and resolves each bullet sequentially, reevaluates availability between activations,
  and allows repetition only for scaled modals, matching Q6795-Q6797 without changing ordinary
  distinct-choice modals.
- **Ruling and behavioral proof:** five sources delete the first target and apply exactly one
  selected DP or security/Recovery bullet. Ten sources can choose the DP bullet twice and apply
  -26000 DP. In a manually driven two-activation window, the first -13000 DP reaches 0 while the
  Digimon remains on the field for the second choice; the security/Recovery bullet then resolves
  and the rule check deletes it afterward, proving Q6796/Q6798. A mechanism regression removes
  all ten sources after the first choice yet still opens the second, proving Q6797's snapshot. A
  synthetic immediate leave reaction to Omnimon's initial deletion removes Omnimon before the
  modal; no option is offered and the other target remains unmodified, proving Q7191.
- **Evolution and DNA proof:** normal blue EX12-035, yellow EX12-036, and red EX12-017 routes pay
  5; off-color purple/black VB P-240 uses the alternate route for 5. All four Blue/Yellow ×
  Red/Black level-6 DNA combinations merge for 0, while Blue + Yellow is rejected. Catalog
  identity, stats, traits, keywords, direct/shared requirements, full coverage, empty residuals,
  and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-037.test.ts` — 7/7; interpreter capabilities — 290/290; DNA merge — 1/1;
  Blocker proof — 4/4; security/Blocker/Piercing conformance — 10/10; deletion/advanced keyword
  conformance — 30/30; rule-check pool — 3/3; interpreter — 171/171; effect primitives — 126/126;
  digivolution action flow — 27/27; security checks — 11/11; shared build, API typecheck, focused
  formatting, focused lint, and `git diff --check` passed. No residual IR, unsupported behavior,
  or unresolved ruling remains.

## EX12-038 — Kokuwamon — 10/10

- **Printed contract:** Yellow level 3 Machine/ME Data Digimon, play cost 3 and 2000 DP. Normal
  yellow/black level-2 evolution and alternate level-2 ME evolution cost 0. On Play, it may trash
  one Mutant- or ME-trait hand card as a `By` cost to draw 2. Its inherited When Attacking effect
  gives one opposing Digimon -2000 DP for the turn, once per turn.
- **KB evidence:** no card-specific Q&A is present in the committed knowledge base. The rules
  interpretation required here is the standard optional activation of a `By` cost: declining or
  lacking a payable card leaves the entire effect unprocessed.
- **Corrections:** the direct module omitted `optional` and `abortOnDecline`, incorrectly making
  the hand trash mandatory whenever a candidate existed and contradicting the aggregate IR. It
  now represents an optional all-or-nothing activation and matches the aggregate record exactly.
  Registration remains exclusively through `registerIrCard`.
- **Behavioral proof:** accepting with a pure Mutant card and separately with an ME card trashes
  exactly that card and draws two. Declining with a valid card neither trashes nor draws; a hand
  containing only a nonmatching card likewise leaves the hand and deck unchanged. As an inherited
  source, Kokuwamon applies -2000 DP on the first attack timing and a second same-turn timing does
  not stack another reduction. The effect is asserted as inherited rather than top-level.
- **Evolution proof:** yellow BT1-005 and black BT10-005 use the normal zero-cost routes; ME egg
  EX12-003 uses the alternate zero-cost route; red non-ME BT1-001 is rejected for the alternate.
  Catalog identity, stats, traits, direct/shared requirements, full coverage, empty residuals,
  and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-038.test.ts` — 6/6; effect primitives — 126/126; interpreter — 171/171;
  digivolution action flow — 27/27; API typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-039 — Takinmon — 10/10

- **Printed contract:** Yellow level 3 Beast/Shambala/SW Vaccine Digimon, play cost 3 and 2000 DP.
  Normal yellow level-2 and alternate level-2 Shambala evolution cost 0. During its controller's
  turn and only in the battle area, evolving this Digimon into an SW Digimon costs 1 less. Its
  inherited effect is Barrier.
- **KB evidence:** Q6799 explicitly excludes the breeding area from the cost-reduction effect.
- **Corrections:** the direct replacement's destination filter omitted the aggregate record's
  explicit own-controller and Digimon-kind constraints. They were behaviorally redundant for the
  current digivolution intent but left the two executable sources unequal and weakened the
  contract. The direct module now carries the complete filter and exactly matches the aggregate
  IR. Registration remains exclusively through `registerIrCard`.
- **Ruling and behavioral proof:** from the battle area, evolution into SW EX12-043 is reduced from
  2 to 1; the same evolution from breeding costs the full 2, proving Q6799. A non-SW evolution
  receives no reduction. Takinmon on top has no Barrier, while a host with Takinmon underneath has
  Barrier; accepting the real prompt trashes one security card and prevents effect deletion.
- **Evolution proof:** yellow BT1-005 uses the normal zero-cost route; purple Shambala EX12-004
  uses the alternate zero-cost route; black non-Shambala BT10-005 is rejected for the alternate.
  Catalog identity, stats, traits, direct/shared requirements, full coverage, empty residuals,
  and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-039.test.ts` — 6/6; digivolution action flow — 27/27; breeding-resident
  exclusion — 2/2; deletion/advanced keyword conformance — 30/30; interpreter — 171/171; effect
  primitives — 126/126; API typecheck, focused formatting, focused lint, and `git diff --check`
  passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-040 — Salamon — 10/10

- **Printed contract:** Yellow level 3 Mammal/VB Vaccine Digimon, play cost 3 and 2000 DP. Normal
  yellow level-2 evolution and alternate evolution from Nyaromon or a level-2 VB card cost 0.
  During its controller's turn and only in the battle area, evolving this Digimon into a Holy
  Beast- or VB-trait Digimon costs 1 less. Its inherited effect is Barrier.
- **KB evidence:** Q6800 explicitly excludes the breeding area from the cost-reduction effect.
- **Corrections:** as on EX12-039, the direct destination filter omitted the aggregate IR's own-
  controller and Digimon-kind constraints. The full filter is now encoded in the direct module,
  making both executable records exactly equal. Registration remains exclusively through
  `registerIrCard`.
- **Ruling and behavioral proof:** from the battle area, Holy Beast BT1-051 is reduced from cost 2
  to 1, and VB EX12-013 is independently reduced from 3 to 2. Non-Holy-Beast/non-VB BT1-053 gets
  no reduction. From breeding, the same Holy Beast evolution pays the full cost, proving Q6800.
  Salamon on top has no Barrier; a host carrying Salamon inherits it, can trash one security card,
  and survives effect deletion.
- **Evolution proof:** yellow BT1-005 uses the normal route; green Nyaromon EX5-003 proves the
  name route independently of color; EX12-001 proves the level-2 VB route; black nonmatching
  BT10-005 is rejected. Catalog identity, stats, traits, direct/shared requirements, full coverage,
  empty residuals, and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-040.test.ts` — 8/8; digivolution action flow — 27/27; breeding-resident
  exclusion — 2/2; deletion/advanced keyword conformance — 30/30; interpreter — 171/171; effect
  primitives — 126/126; API typecheck, focused formatting, focused lint, and `git diff --check`
  passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-041 — Thundermon — 10/10

- **Printed contract:** Yellow/black level 4 Mutant/ME Data Digimon, play cost 5 and 6000 DP.
  Normal yellow/black level-3 evolution costs 3; level-3 ME evolution costs 2. Its Main once per
  turn may play a Mutant/ME Digimon or Tamer, or use a Mutant/ME Option, from hand with cost
  reduced by 2. Its Rule also treats it as Mamemon. Its inherited When Attacking effect gives one
  opposing Digimon -2000 DP for the turn, once per turn.
- **KB evidence:** Q6801 forbids combining two copies' effects into one play/use with -4. Q6802
  allows the play under Solarmon but removes the discount. Q6803 allows activation under Pomumon
  but prevents the effect from playing a Digimon.
- **Corrections:** the aggregate IR used an obsolete PlayWithoutCost plus detached replacement,
  could not use Options, omitted the eligible kind split, and did not bind the reduction to the
  selected operation. It now uses the same two-branch paid modal as the direct module, with
  `reduceCostBy: 2` on each branch and exact direct/aggregate equality. Registration remains
  exclusively through `registerIrCard`.
- **Ruling and behavioral proof:** the play branch pays printed cost minus 2 and the Option branch
  uses EX12-072 with the same reduction. Two Thundermon copies independently play two cost-5
  targets for 3 each; neither target receives a combined -4, proving Q6801. With opposing Solarmon,
  EX12-038 plays for its full cost 3, proving Q6802. With opposing Pomumon, the Main activation is
  accepted but the Digimon remains in hand and no memory is paid, proving Q6803. One source cannot
  activate Main twice in the turn, while separate copies retain their own use. The Rule name grant
  is structurally asserted. As an inherited source, two attack timings apply only one -2000 DP.
- **Evolution proof:** yellow EX12-038 and black EX12-053 use the normal cost-3 routes; red ME
  EX12-008 uses the alternate cost-2 route; blue non-ME BT1-009 is rejected. Catalog identity,
  stats, traits, direct/shared requirements, full coverage, empty residuals, and exact IR equality
  are asserted.
- **Verification:** `EX12-041.test.ts` — 10/10; interpreter capabilities — 290/290; effect
  primitives — 126/126; interpreter — 171/171; digivolution action flow — 27/27; Solarmon — 2/2;
  Pomumon — 1/1; shared build, API typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-042 — Gatomon — 10/10

- **Printed contract:** Yellow/green level 4 Holy Beast/NSp/VB Vaccine Digimon, play cost 4 and
  4000 DP. Normal yellow/green level-3 evolution costs 3; evolution from Salamon or a level-3
  NSp/VB card costs 2. It has Blocker. Its shared On Play/When Attacking once-per-turn effect adds
  the top security card to hand, then performs Recovery +1. Its inherited effect is Barrier.
- **KB evidence:** Q6804 confirms that the effect can activate with zero security cards: the first
  instruction moves nothing, then Recovery +1 still resolves.
- **Corrections:** the aggregate IR encoded Recovery as generic `SecurityManipulation addTop`, while
  the direct executable module correctly used the Recovery keyword action. Both aggregate trigger
  branches now use the exact executable `GainKeyword` representation and direct/aggregate equality
  is asserted. Registration remains exclusively through `registerIrCard`.
- **Ruling and behavioral proof:** On Play moves the top security card to hand and recovers the top
  deck card. With empty security, no card enters hand and recovery still succeeds, proving Q6804.
  After On Play consumes the shared once-per-turn use, a same-turn When Attacking timing makes no
  second security move or recovery. Gatomon has Blocker only while on top. A host with Gatomon
  underneath has Barrier; accepting the real prompt trashes one security card, prevents effect
  deletion, and leaves the host in the battle area.
- **Evolution proof:** yellow BT1-045 and green BT1-064 use the normal cost-3 routes; purple Salamon
  BT9-072 proves the name route independently of color; blue NSp EX7-015 proves the trait route;
  red nonmatching BT1-009 is rejected. Catalog identity, stats, traits, direct/shared requirements,
  full coverage, empty residuals, and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-042.test.ts` — 7/7; Blocker proof — 4/4; deletion/advanced keyword
  conformance — 30/30; effect primitives — 126/126; interpreter — 171/171; digivolution action
  flow — 27/27; security checks — 11/11; shared build, API typecheck, focused formatting, focused
  lint, and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling
  remains.

## EX12-043 — Hakubamon — 10/10

- **Printed contract:** Yellow level 4 Holy Beast/Shambala/SW Vaccine Digimon, play cost 5 and
  6000 DP. Normal yellow level-3 and alternate level-3 Shambala evolution both cost 2. Its Main
  once-per-turn effect may play an SW Digimon/Tamer or use an SW Option from hand with the cost
  reduced by 2. Its inherited effect is Barrier.
- **KB evidence:** Q6805 forbids combining the reductions from two copies into one operation.
  Q6806 permits the play under Solarmon but suppresses the reduction. Q6807 permits activation
  under Pomumon but prevents the effect from playing a Digimon.
- **Corrections:** the aggregate IR used an obsolete PlayWithoutCost plus detached replacement,
  omitted the Option-use branch and eligible kinds, and did not bind the reduction to the chosen
  operation. It now exactly matches the direct two-branch paid modal. The direct Option branch
  also now permits multicolor Options, as the unrestricted printed SW predicate requires; this
  makes committed multicolor SW Option EX12-071 executable. Registration remains exclusively
  through `registerIrCard`.
- **Ruling and behavioral proof:** the play branch pays printed cost minus 2. The Option branch
  uses three-color EX12-071 for cost 1, pays its SW hand-trash cost, draws, and places the Option
  in the battle area. One source cannot activate twice. Two Hakubamon copies independently play
  two cost-5 targets for 3 each rather than combining into a free play, proving Q6805. Solarmon
  forces full printed cost, proving Q6806. Under Pomumon the activation succeeds but the target
  remains in hand and memory is unchanged, proving Q6807. A host carrying Hakubamon inherits
  Barrier, trashes one security card at the real prompt, and survives effect deletion.
- **Evolution proof:** yellow BT1-045 uses the normal cost-2 route; red Shambala EX12-006 proves
  the alternate route independently of color; red nonmatching BT1-009 is rejected. Catalog
  identity, stats, traits, direct/shared requirements, full coverage, empty residuals, and exact
  direct/aggregate equality are asserted.
- **Verification:** `EX12-043.test.ts` — 9/9; interpreter capabilities — 290/290; effect primitives
  — 126/126; interpreter — 171/171; Option-use mechanism — 10/10; deletion/advanced keyword
  conformance — 30/30; digivolution action flow — 27/27; Solarmon — 2/2; Pomumon — 1/1;
  EX12-071 — 6/6; shared build, API typecheck, focused formatting, focused lint, and
  `git diff --check` passed. No residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-044 — Angewomon — 10/10

- **Printed contract:** Yellow level 5 Archangel/NSp/VB Vaccine Digimon, play cost 7 and 7000 DP.
  Normal yellow level-4 and alternate level-4 NSp/VB evolution cost 3. Its DNA requirement is a
  yellow/blue level 4 plus a green/black level 4 for cost 0. On Play, When Digivolving, and When
  Attacking each give one opposing Digimon -4000 DP for the turn. When attacking with at least
  two same-level cards anywhere in its stack, it may evolve into an Angel, Holy Dragon, Three
  Great Angels, NSp, or VB Digimon from hand with the cost reduced by 2. It inherits Decode for
  level-4-or-lower Holy Beast/NSp/VB cards.
- **KB evidence:** Q6808 defines the stack condition across every stacked card, including the top
  card: a level-5 top card and a level-5 digivolution card satisfy it, as do two level-4 sources.
- **Corrections:** the aggregate IR omitted all four DNA recipes, omitted paid-cost semantics from
  the attack digivolution, and represented Q6808 as a non-executable raw condition. The direct
  module's condition used a tolerated but noncanonical `value` field. Both now use the executable
  `stackHasSameLevelCards` count. Most importantly, inherited Decode was only a keyword label; an
  inherited other-than-battle leave replacement now plays an eligible source for free and marks
  it as played by Decode. Direct and aggregate IR match exactly, and registration remains solely
  through `registerIrCard`.
- **Ruling and behavioral proof:** all three -4000 DP timings execute independently. The attack
  evolution pays 1 after reducing Seraphimon's cost by 2. Two level-4 sources satisfy the stack
  condition, and a level-5 top Angewomon plus level-5 Sirenmon separately proves Q6808; a stack
  with distinct levels does not offer the evolution. Inherited Decode plays level-4 Holy Beast,
  NSp, and VB candidates when the host leaves by effect, but rejects a matching level-5 card and
  does not run for battle deletion. The Decode keyword is absent on top and present while inherited.
- **Evolution and DNA proof:** yellow BT1-051 uses the normal route; blue NSp EX7-018 uses the
  alternate route; blue nonmatching AD1-010 is rejected. All four yellow/blue plus green/black DNA
  combinations resolve for cost 0, while yellow plus blue is rejected. Catalog identity, stats,
  traits, direct/shared requirements, full coverage, empty residuals, and exact IR equality are
  asserted.
- **Verification:** `EX12-044.test.ts` — 10/10; interpreter capabilities — 290/290; effect
  primitives — 126/126; interpreter — 171/171; leave prevention — 10/10; digivolution action flow
  — 27/27; DNA flow — 1/1; deletion/advanced keyword conformance — 30/30; shared build, API
  typecheck, focused formatting, focused lint, and `git diff --check` passed. No residual IR,
  unsupported behavior, or unresolved ruling remains.

## EX12-045 — Sanzomon — 10/10

- **Printed contract:** Yellow level 5 Monk/Shambala/SW Vaccine Digimon, play cost 7 and 7000 DP.
  Normal yellow level-4 and alternate level-4 Shambala evolution cost 3. On Play and When
  Digivolving, it may move the top security card to hand, then recovers if 2 or fewer security
  cards remain. During its turn, once per turn when its security is removed from, it may play a
  Digimon/Tamer with Gokuumon in its text or the SW trait from hand with cost reduced by 2. Its
  inherited When Attacking once-per-turn effect gives one opposing Digimon -4000 DP for the turn.
- **KB evidence:** Q6809 defines “X in its text” across names, traits, effects, inherited effects,
  rules, and all requirement forms. Q6810 forbids combining two copies' reductions into one play.
  Q6811 permits the play under Solarmon but suppresses the reduction. Q6812 permits activation
  under Pomumon but prevents the effect-driven Digimon play.
- **Corrections:** both aggregate Recovery instructions were generic optional security additions,
  rather than the direct executable mandatory-tail Recovery keyword action. The aggregate watcher
  also used an obsolete detached reduction that was not bound to its play. It now carries inline
  `reduceCostBy: 2`, and both direct and aggregate explicitly restrict play candidates to Digimon
  and Tamers. Exact IR equality is asserted; registration remains exclusively via `registerIrCard`.
- **Ruling and behavioral proof:** both entry timings move the top security card and recover after
  the move leaves 2; leaving 3 suppresses recovery. Declining the optional move does not abort the
  mandatory tail, so a pre-existing count of 2 still recovers. EX6-024, a non-SW card mentioning
  Gokuumon only in its DigiXros text, is played for 5, proving Q6809. Two copies each play a cost-3
  target for 1 rather than combining reductions, proving Q6810. Solarmon forces full cost for
  Q6811; Pomumon leaves the target in hand without payment for Q6812. Opposing security removal is
  ignored, own removal is once per turn, and the inherited -4000 DP applies only once.
- **Evolution proof:** yellow BT1-051 uses the normal route; red Shambala EX12-011 uses the
  alternate route independently of color; blue nonmatching AD1-010 is rejected. Catalog identity,
  stats, traits, direct/shared requirements, full coverage, empty residuals, and exact IR equality
  are asserted.
- **Verification:** `EX12-045.test.ts` — 11/11; interpreter capabilities — 290/290; effect
  primitives — 126/126; interpreter — 171/171; subtriggers — 23/23; security-removal watcher scope
  — 3/3; digivolution action flow — 27/27; Solarmon — 2/2; Pomumon — 1/1; shared build, API
  typecheck, focused formatting, focused lint, and `git diff --check` passed. No residual IR,
  unsupported behavior, or unresolved ruling remains.

## EX12-046 — Shishimamon — 10/10

- **Printed contract:** Yellow/red level 5 Holy Beast/Shambala/TB Vaccine Digimon, play cost 7 and
  7000 DP. Normal yellow/red level-4 evolution costs 4; alternate level-4 Shambala costs 3.
  Assembly places one level-4-or-lower TB card for a 2-cost play reduction. On Play and When
  Digivolving, one opposing Digimon gets Security Attack -1 and -3000 DP until the opponent's turn
  ends. During its turn, opposing security removal lets it evolve into a TB Digimon from hand with
  cost reduced by 2. Its inherited End of Attack once-per-turn effect plays a TB Digimon with 5000
  DP or less from hand for free.
- **KB evidence:** Q6728 allows the controller to order the inherited End of Attack effect and
  Execute; resolving Execute first removes the source and prevents the inherited effect. Q6813
  gives Security effects priority over pending security-check/removal triggers. Q6814 confirms
  that evolving Shishimamon during its attack leaves the inherited End of Attack effect available.
- **Corrections:** the two printed debuffs previously selected independently and could affect
  different Digimon. Each timing now binds the chosen DP target and reuses it for Security Attack
  -1. The aggregate IR omitted both Security Attack actions, the opponent-only security-removal
  filter, the hand origin, and paid-cost semantics of the triggered evolution; all are restored.
  Direct and aggregate IR match exactly, and registration remains exclusively via `registerIrCard`.
- **Ruling and behavioral proof:** On Play and When Digivolving put both debuffs on exactly one
  chosen target while leaving another untouched. Own security removal is ignored; opposing
  removal evolves into EX12-047 and pays 2 after the reduction. An earlier removal with no legal
  target does not stop a later removal from resolving. The inherited effect plays only a TB card
  at 5000 DP or less and is once per turn; 6000-DP Manekimon is rejected. In a real attack,
  security removal evolves Shishimamon into EX12-047, then the inherited End of Attack effect
  still plays Wankomon, proving Q6814. The existing two-order Execute proof passes both Q6728
  outcomes, and security-priority conformance covers Q6813.
- **Assembly and evolution proof:** level-4 TB Manekimon assembles for a 2-cost reduction and is
  placed under Shishimamon; level-5 Darumamon is rejected. Yellow BT1-051 and red EX12-011 use the
  normal routes; blue Shambala EX12-025 uses the alternate route; blue nonmatching AD1-010 is
  rejected. Catalog identity, direct/shared requirements, full coverage, empty residuals, and
  exact IR equality are asserted.
- **Verification:** `EX12-046.test.ts` — 10/10; interpreter capabilities — 290/290; effect
  primitives — 126/126; interpreter — 171/171; digivolution action flow — 27/27; play/Assembly
  action flow — 26/26; security-removal watcher scope — 3/3; combat controller — 23/23; security
  strike count — 8/8; EX12-004 Execute ordering — 6/6; timing-priority conformance — 19/19;
  shared build, API typecheck, focused formatting, focused lint, and `git diff --check` passed. No
  residual IR, unsupported behavior, or unresolved ruling remains.

## EX12-047 — Amaterasumon — 10/10

- **Printed contract:** Yellow/red level 6 Shaman/Sanmyojin/Tentei Hachibushu/Shambala/TB
  Vaccine Digimon, play cost 12 and 12000 DP. Normal yellow/red level-5 evolution costs 4;
  alternate level-5 Shambala evolution costs 3. It has Piercing, Security Attack +1, and
  Ascension. On Play and When Digivolving, it deletes one opposing lowest-DP Digimon; then, by
  returning exactly two cards from the opponent's trash to deck bottom, it gains +6000 DP and
  gives one opposing Digimon -5000 DP per distinct color among those cards for the turn. On
  Deletion, it may recover one TB card from trash, then may play a level-5-or-lower TB Digimon
  from hand for free.
- **KB evidence:** Q6815 permits either ordering of Ascension and On Deletion but invalidates the
  latter if Ascension moves the source first. Q6816 assigns selection and deck-bottom ordering to
  the activating player. Q6817 says a Digi-Egg routed to the Egg Deck still satisfies the cost.
  Q6818 requires exactly two cards. Q6819 invalidates a deleted card's pending On Deletion if the
  same resolving effect returns it from trash first. Q6820 counts distinct colors across both
  returned cards, so red/blue plus blue/yellow produces -15000 DP. Q7192 confirms that a started
  effect finishes resolving even if an immediate leave response removes its source.
- **Corrections:** the aggregate IR applied +6000 permanently to an arbitrary allied Digimon,
  treated the printed cost as an optional action, omitted color tracking, and entirely omitted
  the opposing -5000-per-color action. Both entry timings now exactly match the direct executable
  IR: the source receives +6000 for the turn only after the exact two-card cost, colors are
  recorded from the moved cards, and a separately selected opposing Digimon receives the scaled
  turn modifier. Registration remains exclusively via `registerIrCard`.
- **Ruling and behavioral proof:** the activating seat manually chooses two cards from four legal
  opposing trash candidates for Q6816. Returning a Digi-Egg to its Egg Deck still grants +6000
  and enables the color-scaled reduction for Q6817. With only one available card neither
  follow-up modifier resolves, proving Q6818. Deleting Leomon and returning it before its pending
  On Deletion activation prevents its memory gain for Q6819. Returning red/blue Veemon and
  blue/yellow Patamon produces exactly -15000 for Q6820. Explicit trigger ordering proves both
  Q6815 branches: On Deletion first recovers and plays Wankomon, while Ascension first moves
  Amaterasumon to security and drops the pending effect. The effect stack's collectability and
  sequential-body suites cover the pending-source and full-resolution rules used by Q7192.
- **Evolution and keyword proof:** yellow/red Shishimamon and Gokuumon use the normal cost-4
  routes; off-color blue/yellow Shambala MarineBullmon uses the alternate cost-3 route. Printed
  keyword parsing and compiled IR expose Piercing, Security Attack +1, and Ascension, while the
  real deletion flow places Amaterasumon on top of security. Catalog identity, direct/shared
  requirements, full coverage, empty residuals, and exact direct/aggregate equality are asserted.
- **Verification:** `EX12-047.test.ts` — 11/11; interpreter capabilities — 290/290; effect
  primitives — 126/126; interpreter — 171/171; digivolution action flow — 27/27; advanced
  keywords — 25/25; deletion/advanced-keyword conformance — 30/30; effect stack — 31/31;
  timing/resolution conformance — 17/17; shared build, API typecheck, focused formatting,
  focused lint, and `git diff --check` passed. No residual IR, unsupported behavior, or unresolved
  ruling remains.
