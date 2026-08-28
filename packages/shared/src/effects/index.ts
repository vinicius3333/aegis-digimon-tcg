// Effect IR: the declarative model produced by runtime effect records and
// consumed by the runtime interpreter (apps/api/src/engine/effects/interpreter.ts).
export {
  compiledEffects,
  getCompiledCard,
  appFusionCostFor,
  digivolutionRequirementsFor,
  tamerOntoDigivolveLevel,
  ALTERNATE_DIGIVOLUTION_OVERRIDES,
  dnaDigivolutionRequirementsFor,
  DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES,
  baseGrantedDigivolveFor,
  BASE_GRANTED_DIGIVOLVE,
  digiXrosRequirementFor,
  DIGIXROS_REQUIREMENT_OVERRIDES,
  digiXrosTrashNameAllowanceFor,
  DIGIXROS_TRASH_NAME_ALLOWANCES,
  assemblyRequirementFor,
} from "./data.js";
export { canAssignDistinctColors, filterToDistinctColors } from "./differentColors.js";
export type * from "./ir/actions/action.js";
export type * from "./ir/actions/base.js";
export type * from "./ir/actions/board.js";
export type * from "./ir/actions/branching.js";
export type * from "./ir/actions/combat.js";
export type * from "./ir/actions/digivolve.js";
export type * from "./ir/actions/dnaFusion.js";
export type * from "./ir/actions/meta.js";
export type * from "./ir/actions/play.js";
export type * from "./ir/actions/removal.js";
export type * from "./ir/actions/replacement.js";
export type * from "./ir/actions/resources.js";
export type * from "./ir/actions/restrictions.js";
export type * from "./ir/actions/reveal.js";
export type * from "./ir/actions/security.js";
export type * from "./ir/actions/statics.js";
export type * from "./ir/actions/subTrigger.js";
export type * from "./ir/actions/xrosLink.js";
export type * from "./ir/card.js";
export type * from "./ir/durations.js";
export type * from "./ir/filters/boardPredicates.js";
export type * from "./ir/filters/cardPredicates.js";
export type * from "./ir/filters/compilerAliases.js";
export type * from "./ir/filters/contextPredicates.js";
export type * from "./ir/filters/dp.js";
export type * from "./ir/filters/filter.js";
export type * from "./ir/filters/zones.js";
export type * from "./ir/keywords.js";
export type * from "./ir/predicates/conditions.js";
export type * from "./ir/predicates/costs.js";
export type * from "./ir/predicates/scaling.js";
export type * from "./ir/requirements/digivolve.js";
export type * from "./ir/requirements/fusion.js";
export type * from "./ir/requirements/xrosLink.js";
export type * from "./ir/triggers.js";
