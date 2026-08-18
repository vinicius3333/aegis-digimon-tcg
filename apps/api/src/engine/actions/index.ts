/**
 * Player verbs (subsystems: play-card, digivolve, attack-and-block,
 * security-and-win-check). Each action validates legality against current state,
 * applies cost, mutates state, then asks the effect stack to fire the relevant
 * timing (ARCHITECTURE.md section 3).
 *
 * Implemented:
 *   - digivolve.ts       (subsystem: digivolve)
 *   - playCard.ts        (subsystem: play-card)
 *   - attack.ts          (subsystem: attack-and-block)
 *   - block.ts           (subsystem: attack-and-block)
 *   - breeding.ts        (subsystem: deck-and-setup / breeding; hatchEgg / moveFromBreeding)
 *   - link.ts            (subsystem: link; linkCard — the hand half of §6-5-1-4)
 *   - dnaDigivolve.ts    (subsystem: dna-digivolve; §8-2 DNA digivolution as a player verb)
 *
 * Not extracted into this directory (both are fully implemented, just live
 * elsewhere):
 *   - security check   (subsystem: security-and-win-check) lives in
 *     engine/security/securityCheck.ts, driven by combat.
 *   - end phase         (subsystem: turn-phase-state-machine) lives in
 *     engine/intentRouter.ts as handleEndPhase.
 */

export {
  validateDigivolve,
  applyDigivolve,
  memoryDepsFromGauge,
  isDigivolveCandidate,
  DIGIVOLVE_TIMING,
  type DigivolveIntent,
  type DigivolveDeps,
  type DigivolveCheck,
  type DigivolveOutcome,
  type DigivolveRejection,
  type DigivolveEvent,
  type MemoryPort,
} from "./digivolve.js";

export {
  validatePlayCard,
  applyPlayCard,
  defaultPlayCardDeps,
  ON_PLAY_TIMING,
  ON_USE_OPTION_TIMING,
  type PlayCardIntent,
  type PlayCardDeps,
  type PlayCardCheck,
  type PlayCardOutcome,
  type PlayCardRejection,
  type PlayCardEvent,
  type PlayMode,
} from "./playCard.js";

export {
  validateDigiXros,
  applyDigiXros,
  type DigiXrosIntent,
  type DigiXrosDeps,
  type DigiXrosCheck,
  type DigiXrosOutcome,
  type DigiXrosRejection,
} from "./digiXros.js";

export {
  validateAssembly,
  applyAssembly,
  materialsSatisfyAssemblyRecipe,
  type AssemblyIntent,
  type AssemblyDeps,
  type AssemblyCheck,
  type AssemblyOutcome,
  type AssemblyRejection,
} from "./assembly.js";

export {
  validateAttack,
  applyAttack,
  type AttackIntent,
  type AttackDeps,
} from "./attack.js";

export {
  applyDeclareBlock,
  applyDeclineBlock,
  validateDeclareBlock,
  type BlockDeps,
} from "./block.js";

export {
  applyRespondAlliance,
  applyRespondEvade,
  applyRespondBarrier,
  type CombatDecisionDeps,
} from "./combatDecisions.js";

export {
  validateRespondCounter,
  applyRespondCounter,
  COUNTER_TIMING,
  type RespondCounterIntent,
  type RespondCounterDeps,
  type RespondCounterCheck,
  type RespondCounterOutcome,
} from "./counter.js";

export {
  validateLinkCard,
  applyLinkCard,
  type LinkCardIntent,
  type LinkCardDeps,
  type LinkCardCheck,
  type LinkCardOutcome,
  type LinkCardRejection,
} from "./link.js";

export {
  validateDnaDigivolve,
  applyDnaDigivolve,
  type DnaDigivolveIntent,
  type DnaDigivolveDeps,
  type DnaDigivolveCheck,
  type DnaDigivolveOutcome,
  type DnaDigivolveRejection,
} from "./dnaDigivolve.js";

export {
  validateHatchEgg,
  applyHatchEgg,
  validateMoveFromBreeding,
  applyMoveFromBreeding,
  canHatch,
  canMove,
  type HatchEggIntent,
  type MoveFromBreedingIntent,
  type BreedingDeps,
  type BreedingRejection,
  type BreedingOutcome,
  type BreedingEvent,
} from "./breeding.js";
