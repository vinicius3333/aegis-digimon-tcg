# Counter and effect selection design

## Final interaction

Counter has no modal. A compact rail above the hand shows attacker artwork, instructions, and Pass. Switch sources by selecting another eligible hand card; there is no Change card button. The centered Pass button occupies the available action row up to a maximum width of 320px. Only server-eligible hand cards are highlighted. Selecting one highlights its legal hosts on the actual field. Clicking a legal host submits the exact Counter intent; even a single host requires a deliberate click. Ambiguous Blast DNA materials use compact inline choices after the host click. Normal play/drag actions are suppressed during Counter selection; invalid field targets remain inspectable without triggering game actions.

Decoy also uses the actual field. Highlight only eligible candidate permanents; picking one arms the sacrifice and requires explicit Confirm. The optional None action declines without selecting a card. Preserve exact instance identity for duplicate printed cards.

Blocker, Alliance, Barrier/Evade, other generic effect decisions, action confirmation (including Dual Play), Assembly, and DigiXros retain consistent navy/gold artwork-first prompts. Evolution-cost selection keeps its existing artwork header. Shared framing centralizes card inspection, focus handling, and styles while selection rules remain unchanged. Every remaining modal offers View board and Return to decision without clearing picks or answering the game action. Scope excludes lobby/settings and card inspectors.

## Rules and evidence

Reject ordinary Blast onto Yuuko while preserving explicit special routes. Counter-derived effects finish before Blocker; block-derived effects finish before battle. Existing sequencing regressions and the live arena already demonstrate correct attack timing, so do not introduce an unsupported timing change. Correct the generic Tamer level waiver and retain BT25-082's genuine all-turn base-granted route.

## Validation

Use actual Hand and field components in interaction tests: eligible sources/hosts, invalid targets, no premature activation, Back/Pass, duplicate copies, and exact Counter intent. Verify Decoy's real demo through board selection and explicit confirmation. Cover modal board-inspection selection/focus retention. Run focused engine/card regressions, web/API/shared typechecks, lint/format and whitespace checks. Verify the final flow using Orca at http://localhost:5173/dev/arena and Decoy at /dev/card-effects/EX3-046.

ImageGen prototypes explore visual direction. The initial two-step modal prototype was superseded by the user's final hand-to-field interaction. Actual implementation uses catalog artwork and authoritative engine choices; a dotted connector remains optional future polish.
