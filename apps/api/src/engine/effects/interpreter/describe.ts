// Human-readable summaries of an action or effect, for decisions and logs.

import type { Action, CardEffect, Cost } from "@aegis/shared";

/**
 * Turn an IR identifier into a readable phrase ("payMemory" -> "Pay memory").
 * Last resort for {@link describeCost} only. {@link describeAction} deliberately does
 * not use it: the client drops a bare identifier prompt and shows the printed clause
 * instead, while a spaced-out identifier ("Cost gated block") reads as card text and
 * reaches the player.
 */
export function humanizeIdentifier(identifier: string): string {
  const words = identifier.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");
  const [first = "", ...rest] = words;
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest.map((word) => (word.length > 2 ? word.toLowerCase() : word))].join(" ");
}

/**
 * The IR's `raw` fields normally carry the card's printed clause, but some compiled
 * cards store an internal identifier there instead (a Replacement whose `raw` is its
 * event name, "wouldBeDeleted"). Prompts must never show one, so this returns the text
 * only when it reads as printed card text, and `undefined` when it is an identifier.
 */
export function printedClause(raw: string | undefined): string | undefined {
  const text = raw?.trim();
  if (text === undefined || text === "") return undefined;
  return /^[a-z][A-Za-z0-9]*$/.test(text) ? undefined : text;
}

const costVerbByKind: Partial<Record<Cost["kind"], string>> = {
  trash: "Trash",
  suspend: "Suspend",
  unsuspend: "Unsuspend",
  return: "Return",
  place: "Place",
  deleteOwn: "Delete",
  reveal: "Reveal",
};

/** Short human description of an activation cost for an optional prompt / log. */
export function describeCost(cost: Cost): string {
  const printed = printedClause(cost.raw);
  if (printed !== undefined) return printed;
  if (cost.kind === "compound" && cost.costs?.length) return cost.costs.map(describeCost).join(" and ");
  if (cost.kind === "payMemory" && cost.memory !== undefined) return `Pay ${cost.memory} memory`;
  const verb = costVerbByKind[cost.kind];
  const count = cost.target?.count;
  if (verb !== undefined && count !== undefined) {
    const zone = cost.target?.filter?.zone;
    const upTo = cost.target?.upTo ? "up to " : "";
    return `${verb} ${upTo}${String(count)} card(s)${zone === "hand" ? " from hand" : ""}`;
  }
  return humanizeIdentifier(cost.kind);
}

/**
 * Short human description of an action for an optional prompt / log.
 *
 * A printed `raw` sub-clause wins, so a card whose effect asks twice ("You may delete...
 * Then, by returning 3 cards..., ＜Recovery +1＞") prompts each question with its own
 * sentence. An unmapped kind falls through as its bare identifier, which the client
 * replaces with its generic prompt over the printed clause.
 */
export function describeAction(action: Action): string {
  const printed = action.kind === "RawUnparsed" ? undefined : printedClause(action.raw);
  if (printed !== undefined) return printed;
  const cost = "cost" in action && action.kind !== "CostGatedBlock" ? (action.cost as Cost | undefined) : undefined;
  const body = describeActionBody(action);
  return cost === undefined ? body : `By paying: ${describeCost(cost)} → ${body}`;
}

function describeActionBody(action: Action): string {
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
    case "CostGatedBlock":
      return `By paying: ${describeCost(action.cost)} → ${action.actions.map(describeAction).join(", ")}`;
    case "SecurityManipulation":
      return describeSecurityManipulation(action);
    default:
      return action.kind;
  }
}

function describeSecurityManipulation(action: Extract<Action, { kind: "SecurityManipulation" }>): string {
  const amount = action.amount ?? 1;
  const whose = action.controller === "opponent" ? "opponent's" : "your";
  switch (action.op) {
    case "addTop":
    case "addBottom":
    case "addTopOrBottom":
      return action.controller === "opponent"
        ? `Add ${amount} card(s) to the opponent's security`
        : `＜Recovery +${amount}＞`;
    case "trashTop":
      return `Trash ${action.upTo ? "up to " : ""}${amount} of ${whose} top security card(s)`;
    case "revealTop":
    case "revealBottom":
      return `Reveal ${whose} ${action.op === "revealTop" ? "top" : "bottom"} security card`;
    case "flipUp":
    case "flipFaceUp":
      return `Flip ${whose} security card face up`;
    case "moveTopToBottom":
      return `Move ${whose} top security card to the bottom`;
    default:
      return action.kind;
  }
}

export function describeEffect(effect: CardEffect): string {
  if (effect.description?.trim()) return effect.description.trim();
  const kw = effect.keywords?.map((k) => k.keyword).join(", ");
  const acts = (effect.actions ?? []).map((action) => describeAction(action)).join(", ");
  return `[${effect.trigger}]${kw ? ` ＜${kw}＞` : ""}${acts ? ` ${acts}` : ""}`;
}
