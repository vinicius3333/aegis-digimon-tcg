import type { Action } from "@aegis/shared/effects/ir/actions/action";

export function asksApartFromYesPreset(action: Action): boolean {
  return (action.kind === "EndAttack" || action.kind === "DnaDigivolve") && action.optional === true;
}
