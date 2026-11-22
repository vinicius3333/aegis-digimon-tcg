import type { Action } from "@aegis/shared/effects/ir/actions/action";

export function endsAttackOptionally(action: Action): boolean {
  return action.kind === "EndAttack" && action.optional === true;
}
