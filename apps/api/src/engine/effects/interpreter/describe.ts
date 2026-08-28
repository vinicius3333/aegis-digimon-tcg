// Human-readable summaries of an action or effect, for decisions and logs.

import type { Action, CardEffect } from "@aegis/shared";

/**
 * Turn an IR action kind into a readable phrase ("GainMemory" -> "Gain memory").
 * This is the last resort for {@link describeAction}: every prompt it produces is
 * shown to a player, so a bare internal identifier must never reach the client.
 */
function humanizeActionKind(kind: string): string {
  const words = kind.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");
  const [first, ...rest] = words;
  return [first, ...rest.map((word) => (word.length > 2 ? word.toLowerCase() : word))].join(" ");
}

/** Short human description of an action for an optional prompt / log. */
export function describeAction(action: Action): string {
  switch (action.kind) {
    case "Draw":
      return `Draw ${action.amount}`;
    case "Delete":
      return action.raw ?? `Delete ${String(action.target.count)} target(s)`;
    case "Trash":
      return `Trash ${String(action.target.count)} card(s)`;
    case "Return":
      return `Return ${String(action.target.count)} to ${action.to}`;
    case "ModifyDP":
      return `Modify DP by ${action.amount}`;
    case "SetBaseDP":
      return `Set base DP to ${action.value}`;
    case "PlayWithoutCost":
      return "Play without paying the cost";
    case "PlaceUnder":
      return `Place ${action.target.upTo ? "up to " : ""}${String(action.target.count)} card(s) under`;
    case "RevealAdd":
      return `Reveal top ${action.revealCount} and add`;
    case "GainMemory":
      return action.amount < 0 ? `Lose ${-action.amount} memory` : `Gain ${action.amount} memory`;
    case "SetMemory":
      return `Set memory to ${action.value}`;
    case "Suspend":
      return `Suspend ${String(action.target.count)} target(s)`;
    case "Unsuspend":
      return `Unsuspend ${String(action.target.count)} target(s)`;
    case "GainKeyword":
      return `Gain ${action.keyword?.raw ?? action.keyword?.keyword ?? "keyword"}`;
    case "TrashTopDeck":
      return `Trash ${action.upTo ? "up to " : ""}${action.amount} card(s) from the top of the deck`;
    case "Hatch":
      return "Hatch a Digi-Egg";
    case "Search":
      return "Search your deck";
    case "Digivolve":
      return "Digivolve";
    case "DnaDigivolve":
      return "DNA digivolve";
    case "DeDigivolve":
      return "De-Digivolve";
    default:
      return humanizeActionKind(action.kind);
  }
}

export function describeEffect(effect: CardEffect): string {
  if (effect.description?.trim()) return effect.description.trim();
  const kw = effect.keywords?.map((k) => k.keyword).join(", ");
  const acts = (effect.actions ?? []).map((action) => describeAction(action)).join(", ");
  return `[${effect.trigger}]${kw ? ` ＜${kw}＞` : ""}${acts ? ` ${acts}` : ""}`;
}
