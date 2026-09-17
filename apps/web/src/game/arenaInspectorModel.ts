import type { StackCard } from "./overlays";
import type { EvoCost } from "@aegis/shared";
import { Side } from "./side";

export interface InspectorEvolutionCost {
  level: number;
  memoryCost: number;
  colors: EvoCost["color"][];
}

/** Equal level/cost entries are alternative colors, rather than repeated requirements. */
export function groupedInspectorEvolutionCosts(costs: readonly EvoCost[]): InspectorEvolutionCost[] {
  const groups: InspectorEvolutionCost[] = [];
  for (const cost of costs) {
    const group = groups.find(
      (candidate) => candidate.level === cost.level && candidate.memoryCost === cost.memoryCost,
    );
    if (group) {
      if (!group.colors.includes(cost.color)) group.colors.push(cost.color);
    } else {
      groups.push({ level: cost.level, memoryCost: cost.memoryCost, colors: [cost.color] });
    }
  }
  return groups;
}

export function inspectedArenaHalf(side: Side): "upper" | "lower" {
  return side === Side.Viewer ? "upper" : "lower";
}

/** Schema sources run bottom..below-top; the reading runs directly below top..bottom. */
export function inspectorCardsTopToBottom(cards: readonly StackCard[]): StackCard[] {
  return [
    ...cards.filter((card) => card.role === "top"),
    ...cards.filter((card) => card.role === "stack").reverse(),
    ...cards.filter((card) => card.role === "linked"),
  ];
}

/** Only adjacent lines made entirely of keyword tokens share a wrapping line. */
export function inlineInspectorKeywordLines(text: string): string {
  const lines: string[] = [];
  let previousWasKeyword = false;
  for (const line of text.split(/\r?\n/)) {
    const standalone = /^(?:[ \t]*(?:＜[^＞\r\n]+＞|<[^>\r\n]+>))+[ \t]*$/.test(line);
    if (standalone && previousWasKeyword) lines[lines.length - 1] += ` ${line.trim()}`;
    else lines.push(standalone ? line.trim() : line);
    previousWasKeyword = standalone;
  }
  return lines.join("\n");
}
