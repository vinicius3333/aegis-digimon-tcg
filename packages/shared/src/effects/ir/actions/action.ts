// The closed `Action` union.

import type {
  AddDPFromSuspendedCostAction,
  AddToHandSelfAction,
  GainKeywordAction,
  HandManipulationAction,
  HatchAction,
  ModifyDPAction,
  MovePermanentAction,
  PlaceInBattleAreaSelfAction,
  RepeatPerCountAction,
  SetBaseDPAction,
  SuspendAction,
  UnsuspendAction,
} from "./board.js";
import type {
  ConditionalBranchAction,
  DelayedEffectAction,
  GainEffectAction,
  GainTriggeredEffectAction,
  ModalAction,
} from "./branching.js";
import type {
  ArmSuspendRestrictionAction,
  AttackAction,
  BattleAction,
  EndAttackAction,
  GrantCanAttackUnsuspendedAction,
  GrantVortexCanAttackPlayersAction,
  RedirectAttackAction,
  SelectBindAction,
} from "./combat.js";
import type {
  CannotIgnoreDigivolutionRequirementsAction,
  DeDigivolveAction,
  DigivolveAction,
  PlaceUnderAction,
  TrashDigivolutionAction,
  WaiveColorRequirementAction,
} from "./digivolve.js";
import type { AppFuseAction, DnaDigivolveAction } from "./dnaFusion.js";
import type {
  ActivateEffectAction,
  ActivateForeignEffectAction,
  ActivateMainAction,
  ActivateOptionMainAction,
  RawUnparsedAction,
  ReactivateEffectAction,
  UseOptionWithoutCostAction,
  WinGameAction,
} from "./meta.js";
import type {
  PlayFromZoneAction,
  PlayMultipleAction,
  PlayPerLevelAction,
  PlayTokenAction,
  PlayWithoutCostAction,
} from "./play.js";
import type {
  AddToDPDeleteBudgetAction,
  DelayedDeleteAction,
  DelayedDeletePlayedAction,
  DeleteAction,
  DeleteBudgetAction,
  DeleteByDPBudgetAction,
  DeleteLevelBudgetAction,
  DeletePerColorAction,
  DeleteUntilCountAction,
  DeletionMaxDpModifierAction,
  ReturnAction,
  RevealChooseDeleteBudgetAction,
  TrashAction,
} from "./removal.js";
import type { PreventAction, ReplacementAction } from "./replacement.js";
import type {
  CostGatedBlockAction,
  CostModifierAction,
  DrawAction,
  GainMemoryAction,
  ReducePlayCostAction,
  SetMemoryAction,
  SetTurnEndMemoryAction,
  TrashTopDeckAction,
} from "./resources.js";
import type {
  GlobalRestrictAction,
  GrantImmunityAction,
  MinDpFloorAction,
  RestrictAction,
  RestrictCostReductionAction,
  RestrictDigivolveIntoAction,
  RestrictEffectAction,
  RestrictMemoryGainAction,
  RestrictPlayAction,
  RestrictUnsuspendedDigivolveAction,
  StackTrashLockAction,
} from "./restrictions.js";
import type { RevealAction, RevealAddAction, SearchAction, SearchSecurityAction } from "./reveal.js";
import type {
  DisableSecurityEffectAction,
  ModifySecurityDPAction,
  OpponentMayTrashSecurityAction,
  RecoverByTrashingMostSecurityAction,
  SecurityAttackInvertAction,
  SecurityManipulationAction,
  TrashSecurityTopAction,
} from "./security.js";
import type {
  AuraAction,
  DisableTimingEffectAction,
  GrantAuraToOpponentsAction,
  GrantStaticAction,
} from "./statics.js";
import type { SubTriggerAction } from "./subTrigger.js";
import type {
  AllowDigiXrosMaterialsFromTrashAction,
  DigiXrosMaterialZoneExpansionAction,
  GrantLinkCostReductionAction,
  LinkAction,
  MindLinkAction,
} from "./xrosLink.js";

export type Action =
  | DrawAction
  | GainMemoryAction
  | SetMemoryAction
  | SetTurnEndMemoryAction
  | DeleteAction
  | DeletePerColorAction
  | DeleteUntilCountAction
  | DeleteBudgetAction
  | RevealChooseDeleteBudgetAction
  | DeleteLevelBudgetAction
  | DeleteByDPBudgetAction
  | AddToDPDeleteBudgetAction
  | TrashAction
  | OpponentMayTrashSecurityAction
  | HandManipulationAction
  | ReturnAction
  | SuspendAction
  | RepeatPerCountAction
  | UnsuspendAction
  | MovePermanentAction
  | HatchAction
  | ModifyDPAction
  | AddDPFromSuspendedCostAction
  | SetBaseDPAction
  | GainKeywordAction
  | PlayWithoutCostAction
  | PlayMultipleAction
  | PlayFromZoneAction
  | GainTriggeredEffectAction
  | GainEffectAction
  | CostGatedBlockAction
  | RestrictEffectAction
  | DelayedEffectAction
  | GrantAuraToOpponentsAction
  | DigiXrosMaterialZoneExpansionAction
  | AllowDigiXrosMaterialsFromTrashAction
  | RevealAddAction
  | RevealAction
  | SearchAction
  | SearchSecurityAction
  | DeDigivolveAction
  | DigivolveAction
  | AttackAction
  | BattleAction
  | PlaceUnderAction
  | TrashDigivolutionAction
  | LinkAction
  | GrantLinkCostReductionAction
  | CannotIgnoreDigivolutionRequirementsAction
  | MindLinkAction
  | AddToHandSelfAction
  | PlaceInBattleAreaSelfAction
  | TrashTopDeckAction
  | ActivateMainAction
  | RedirectAttackAction
  | SelectBindAction
  | RestrictAction
  | RestrictUnsuspendedDigivolveAction
  | GrantCanAttackUnsuspendedAction
  | GrantVortexCanAttackPlayersAction
  | EndAttackAction
  | ArmSuspendRestrictionAction
  | SecurityAttackInvertAction
  | RestrictDigivolveIntoAction
  | MinDpFloorAction
  | StackTrashLockAction
  | DelayedDeletePlayedAction
  | DelayedDeleteAction
  | AuraAction
  | GrantStaticAction
  | GrantImmunityAction
  | WaiveColorRequirementAction
  | ModifySecurityDPAction
  | DeletionMaxDpModifierAction
  | CostModifierAction
  | SecurityManipulationAction
  | RecoverByTrashingMostSecurityAction
  | TrashSecurityTopAction
  | PlayPerLevelAction
  | DnaDigivolveAction
  | AppFuseAction
  | PlayTokenAction
  | ModalAction
  | ConditionalBranchAction
  | SubTriggerAction
  | ReplacementAction
  | RestrictMemoryGainAction
  | RestrictCostReductionAction
  | RestrictPlayAction
  | GlobalRestrictAction
  | DisableSecurityEffectAction
  | DisableTimingEffectAction
  | WinGameAction
  | ReactivateEffectAction
  | ActivateEffectAction
  | ActivateForeignEffectAction
  | ActivateOptionMainAction
  | UseOptionWithoutCostAction
  | ReducePlayCostAction
  | PreventAction
  | RawUnparsedAction;

export type ActionKind = Action["kind"];
