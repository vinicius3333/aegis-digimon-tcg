// The IR interpreter's public entry point.
//
// Turns the declarative `CardEffect[]` a card compiles to into runtime behavior, by dispatching
// each `Action` to the effect primitives on `ctx.fx`. `registerIrCard(cardId, compiled)` is what
// every card module calls; it builds a generic EffectModule that maps each CardEffect's trigger
// to an EffectTiming and wires the matching timing builder, so a card with a compiled IR record
// needs no hand-written module.
//
// The implementation is layered under ./interpreter/, bottom to top:
//
//   errors, maps, duration, compiledCards   leaf tables, and the unsupported-action reporter
//   matching/                               does a filter match this definition, permanent, or
//                                           trigger payload?
//   targeting/                              which permanents and loose cards does a Target
//                                           resolve to?
//   scaling, conditions, costs              how much, whether, and at what price
//   actions/                                one module per family of Action kinds, plus the
//                                           runAction dispatch over all 97 of them
//   effect                                  running one CardEffect, and placing it in a timing
//   registration/                           turning a compiled card into a registered module
//
// Dependencies point downward only. The single unavoidable cycle — handlers running nested
// actions while runAction dispatches to handlers — goes through ./interpreter/dispatch.js.
//
// Design constraints (card-module contract):
//   - Breadth over depth: the high-frequency Action kinds are implemented, and everything else
//     (including every RawUnparsed) routes through `unsupported`, which logs and, outside
//     production, throws. Gaps are LOUD, never a silent no-op.
//   - The interpreter only calls primitives that exist on the `Primitives` interface, and
//     resolves targets through read-only GameAccess plus the seat-keyed decision API `ctx.ask`.

// Side-effect imports, load-bearing: runAction.ts and effect.ts install themselves into
// ./interpreter/dispatch.js at load time, and nothing else imports runAction.ts. Without these
// two lines every nested action throws the "dispatch not installed" error at run time.
import "./interpreter/actions/runAction.js";
import "./interpreter/effect.js";

export { linkCostOf } from "./interpreter/actions/link.js";
export {
  hasRegisteredCompiledCard,
  digiXrosOnlyNameAliasesFor,
  runtimeCompiledCard,
  universalNameAliasesFor,
} from "./interpreter/compiledCards.js";
export { evaluateCondition } from "./interpreter/conditions.js";
export { payCost } from "./interpreter/costs.js";
export { UnsupportedEffectError } from "./interpreter/errors.js";
export { grantedTokenEffectsForTiming } from "./interpreter/grantedEffects.js";
export { definitionMatches, matchNameOrTrait } from "./interpreter/matching/definition.js";
export { permanentMatchesFilter } from "./interpreter/matching/permanent.js";
export {
  allowsDigiXrosMaterialsFromTrash,
  allowsExtraDigiXrosMaterials,
  hasBlastDigivolveKeyword,
  hasBlastDnaDigivolveKeyword,
} from "./interpreter/registration/keywords.js";
export { irCardModule, registerIrCard } from "./interpreter/registration/module.js";
export {
  applyWouldBePlayedSelfReducer,
  applyWouldDigivolveSelfReducer,
  potentialWouldBePlayedSelfReduction,
  potentialWouldDigivolveSelfReduction,
  registerWouldBePlayedSelfReducer,
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
} from "./interpreter/registration/reducers.js";
export { candidateLooseInstances } from "./interpreter/targeting/loose.js";
export { candidatePermanents } from "./interpreter/targeting/permanents.js";
export { resolveSelfWhenTrashedFromDeck } from "./interpreter/trashedFromDeck.js";
