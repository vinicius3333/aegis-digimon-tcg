import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActionKind } from "@aegis/shared";

/**
 * Catalog-vs-Action-union gate (ENGINE-HANDLER-PLAN Phase 0).
 *
 * `effects.json` is plain JSON. If the compiler emits an action kind that is not
 * part of the `Action` union, TypeScript can still prove the interpreter switch
 * exhaustive while the live catalog falls through at runtime. This test makes the
 * mismatch explicit: every catalog action kind must either be a real `ActionKind`
 * or appear in `KNOWN_UNIMPLEMENTED_ACTION_KINDS`.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const EFFECTS_PATH = join(ROOT, "packages/shared/src/effects/effects.json");

const IMPLEMENTED_ACTION_KINDS = {
  ActivateEffect: true,
  ActivateForeignEffect: true,
  ActivateMain: true,
  ActivateOptionMain: true,
  AddToDPDeleteBudget: true,
  AddDPFromSuspendedCost: true,
  AddDPFromTrashedCard: true,
  AddToHandSelf: true,
  AllowDigiXrosMaterialsFromTrash: true,
  AppFuse: true,
  ArmSuspendRestriction: true,
  Attack: true,
  Aura: true,
  Battle: true,
  CannotIgnoreDigivolutionRequirements: true,
  ConditionalBranch: true,
  CostModifier: true,
  CostGatedBlock: true,
  RestrictEffect: true,
  DeDigivolve: true,
  DelayedEffect: true,
  DelayedDelete: true,
  DelayedDeletePlayed: true,
  Delete: true,
  DeletePerColor: true,
  DeleteBudget: true,
  DeleteByDPBudget: true,
  DeleteLevelBudget: true,
  DeleteUntilCount: true,
  DeletionMaxDpModifier: true,
  DigiXrosMaterialZoneExpansion: true,
  Digivolve: true,
  DisableSecurityEffect: true,
  DisableTimingEffect: true,
  DnaDigivolve: true,
  Draw: true,
  EndAttack: true,
  GainKeyword: true,
  GainMemory: true,
  GlobalRestrict: true,
  GainTriggeredEffect: true,
  GainEffect: true,
  GrantAuraToOpponents: true,
  GrantCanAttackUnsuspended: true,
  GrantImmunity: true,
  GrantLinkCostReduction: true,
  GrantStatic: true,
  GrantVortexCanAttackPlayers: true,
  HandManipulation: true,
  Hatch: true,
  Link: true,
  MinDpFloor: true,
  MindLink: true,
  OpponentMayTrashSecurity: true,
  Modal: true,
  ModifyDP: true,
  ModifySecurityDP: true,
  MovePermanent: true,
  PlaceInBattleAreaSelf: true,
  PlaceUnder: true,
  PlayFromZone: true,
  PlayMultiple: true,
  PlayPerLevel: true,
  PlayToken: true,
  PlayWithoutCost: true,
  Prevent: true,
  RawUnparsed: true,
  ReactivateEffect: true,
  RecoverByTrashingMostSecurity: true,
  RedirectAttack: true,
  ReducePlayCost: true,
  RepeatPerCount: true,
  Replacement: true,
  Restrict: true,
  RestrictCostReduction: true,
  RestrictDigivolveInto: true,
  RestrictMemoryGain: true,
  RestrictPlay: true,
  RestrictUnsuspendedDigivolve: true,
  Return: true,
  Reveal: true,
  RevealAdd: true,
  RevealChooseDeleteBudget: true,
  Search: true,
  SearchSecurity: true,
  SecurityAttackInvert: true,
  SecurityManipulation: true,
  SelectBind: true,
  SetBaseDP: true,
  SetMemory: true,
  SetTurnEndMemory: true,
  StackTrashLock: true,
  SubTrigger: true,
  Suspend: true,
  Trash: true,
  TrashDigivolution: true,
  TrashTopDeck: true,
  Unsuspend: true,
  UseOptionWithoutCost: true,
  WaiveColorRequirement: true,
  WinGame: true,
  trashSecurityTop: true,
} satisfies Record<ActionKind, true>;

const KNOWN_UNIMPLEMENTED_ACTION_KINDS = {
  AddToHand: true,
  ChooseTarget: true,
  HandSizeReduction: true,
  LinkFromTrash: true,
  Look: true,
  ModifyEffectParameter: true,
  ModifyLevel: true,
  ModifyPlayCost: true,
  Repeat: true,
} as const satisfies Record<string, true>;

type CompiledAction = {
  kind?: string;
  action?: CompiledAction;
  actions?: CompiledAction[];
  then?: CompiledAction[];
  additionalEffects?: CompiledAction[];
  gainedActions?: CompiledAction[];
  options?: CompiledAction[][];
};
type CompiledCard = { effects?: { actions?: CompiledAction[] }[] };

function collectActionKinds(action: CompiledAction, out: Set<string>): void {
  if (typeof action.kind === "string") out.add(action.kind);
  if (action.action) collectActionKinds(action.action, out);
  for (const key of ["actions", "then", "additionalEffects", "gainedActions"] as const) {
    const children = action[key];
    if (Array.isArray(children)) {
      for (const child of children) collectActionKinds(child, out);
    }
  }
  if (Array.isArray(action.options)) {
    for (const option of action.options) {
      for (const child of option) collectActionKinds(child, out);
    }
  }
}

describe("catalog action-kind gate — ENGINE-HANDLER-PLAN Phase 0", () => {
  const effects = JSON.parse(readFileSync(EFFECTS_PATH, "utf8")) as Record<string, CompiledCard>;

  it("has no new action kinds outside the Action union unless explicitly allowlisted", () => {
    const observed = new Set<string>();
    for (const card of Object.values(effects)) {
      for (const effect of card.effects ?? []) {
        for (const action of effect.actions ?? []) collectActionKinds(action, observed);
      }
    }

    const unknown = [...observed]
      .filter((kind) => !(kind in IMPLEMENTED_ACTION_KINDS) && !(kind in KNOWN_UNIMPLEMENTED_ACTION_KINDS))
      .sort();

    expect(unknown, `new action kinds missing from Action union/interpreter plan: ${unknown.join(", ")}`).toEqual([]);
  });
});
