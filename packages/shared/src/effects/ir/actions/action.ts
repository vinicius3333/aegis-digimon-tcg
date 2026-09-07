// The closed `Action` union.

import type {
  AddDPFromTrashedCardAction,
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
  DigivolveViaPlacementAction,
  PlaceUnderAction,
  TamerOntoDigivolveAction,
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
  DeleteByStackColorBudgetAction,
  DeleteByDPBudgetAction,
  DeleteLevelBudgetAction,
  DeletePerColorAction,
  DeleteUntilCountAction,
  DeletionMaxDpModifierAction,
  ReturnAction,
  ReturnToEggDeckAction,
  ReturnTopDigivolutionCardsAction,
  TrashTopStackedCardsAction,
  RevealChooseDeleteBudgetAction,
  TrashAction,
} from "./removal.js";
import type { PreventAction, ReplacementAction } from "./replacement.js";
import type {
  CostGatedBlockAction,
  CostModifierAction,
  DrawAction,
  GainMemoryAction,
  PayMemoryUpToAction,
  ReducePlayCostAction,
  SetMemoryAction,
  SetTurnEndMemoryAction,
  TrashTopDeckAction,
} from "./resources.js";
import type {
  DeclareCategoryImmunityAction,
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
import type {
  HandRevealAddAction,
  LookAction,
  RevealAction,
  RevealAddAction,
  SearchAction,
  SearchSecurityAction,
} from "./reveal.js";
import type {
  DisableSecurityEffectAction,
  ModifySecurityDPAction,
  OpponentMayTrashSecurityAction,
  RecoverAction,
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
  DynamicDigivolutionNamesAction,
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
  | PayMemoryUpToAction
  | SetMemoryAction
  | SetTurnEndMemoryAction
  | DeleteAction
  | DeletePerColorAction
  | DeleteUntilCountAction
  | DeleteBudgetAction
  | DeleteByStackColorBudgetAction
  | RevealChooseDeleteBudgetAction
  | DeleteLevelBudgetAction
  | DeleteByDPBudgetAction
  | AddToDPDeleteBudgetAction
  | TrashAction
  | OpponentMayTrashSecurityAction
  | HandManipulationAction
  | ReturnAction
  | ReturnToEggDeckAction
  | ReturnTopDigivolutionCardsAction
  | TrashTopStackedCardsAction
  | SuspendAction
  | RepeatPerCountAction
  | UnsuspendAction
  | MovePermanentAction
  | HatchAction
  | ModifyDPAction
  | AddDPFromTrashedCardAction
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
  | DynamicDigivolutionNamesAction
  | DigiXrosMaterialZoneExpansionAction
  | AllowDigiXrosMaterialsFromTrashAction
  | RevealAddAction
  | HandRevealAddAction
  | LookAction
  | RevealAction
  | SearchAction
  | SearchSecurityAction
  | DeDigivolveAction
  | DigivolveAction
  | TamerOntoDigivolveAction
  | DigivolveViaPlacementAction
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
  | DeclareCategoryImmunityAction
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
  | RecoverAction
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
