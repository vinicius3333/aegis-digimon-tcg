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
