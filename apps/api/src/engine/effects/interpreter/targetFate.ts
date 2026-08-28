/* What an IR action is about to do to the permanents it asks the player to pick.
   Display-only provenance, in the same family as `activeTiming` / `activeEffectText`:
   the client badges a chosen target with its coming fate instead of reading the
   fate back out of the prompt's printed English.

   Deliberately partial. Only action kinds whose effect on a picked permanent is
   fixed by the kind alone are mapped; anything whose outcome depends on the
   resolution (a modal, a branch, a play/placement) reports nothing, and the badge
   simply does not appear. A wrong badge is worse than no badge. */

import type { Action, TargetFate } from "@aegis/shared";

/**
 * The fate a picked permanent meets under this action, or undefined when the
 * action kind does not determine one.
 */
export function targetFateOf(action: Action): TargetFate | undefined {
  switch (action.kind) {
    case "Delete":
    case "DeletePerColor":
    case "DeleteUntilCount":
    case "DeleteBudget":
    case "DeleteByStackColorBudget":
    case "DeleteLevelBudget":
    case "DeleteByDPBudget":
    case "DelayedDelete":
      return "delete";
    case "Trash":
      return "trash";
    case "Return":
      return action.to === "hand" ? "returnToHand" : "returnToDeck";
    case "ReturnToEggDeck":
      return "returnToEggDeck";
    case "Suspend":
      return "suspend";
    case "Unsuspend":
      return "unsuspend";
    case "Digivolve":
      return "digivolve";
    default:
      return undefined;
  }
}
