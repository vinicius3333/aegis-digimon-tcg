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
  assemblyRequirementFor,
} from "./data.js";
export { canAssignDistinctColors, filterToDistinctColors } from "./differentColors.js";
export type * from "./ir/index.js";
