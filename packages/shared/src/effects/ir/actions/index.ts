// The closed `Action` union. Re-exports every action node.

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
  ConditionalBranchAction,
  DelayedEffectAction,
  GainTriggeredEffectAction,
  ModalAction,
  PreventAction,
  ReplacementAction,
  SubTriggerAction,
} from "./controlFlow.js";
import type {
  AllowDigiXrosMaterialsFromTrashAction,
  AppFuseAction,
  CannotIgnoreDigivolutionRequirementsAction,
  DeDigivolveAction,
  DigiXrosMaterialZoneExpansionAction,
  DigivolveAction,
  DnaDigivolveAction,
  GrantLinkCostReductionAction,
  LinkAction,
  MindLinkAction,
  PlaceUnderAction,
  TrashDigivolutionAction,
  WaiveColorRequirementAction,
} from "./digivolution.js";
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
  DeleteUntilCountAction,
  DeletionMaxDpModifierAction,
  ReturnAction,
  RevealChooseDeleteBudgetAction,
  TrashAction,
} from "./removal.js";
import type {
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

export type * from "./base.js";
export type * from "./board.js";
export type * from "./combat.js";
export type * from "./controlFlow.js";
export type * from "./digivolution.js";
export type * from "./meta.js";
export type * from "./play.js";
export type * from "./removal.js";
export type * from "./resources.js";
export type * from "./restrictions.js";
export type * from "./reveal.js";
export type * from "./security.js";
export type * from "./statics.js";

export type Action =
  | DrawAction
  | GainMemoryAction
  | SetMemoryAction
  | SetTurnEndMemoryAction
  | DeleteAction
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
