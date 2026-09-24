import type { StackCard } from "./overlay";
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
  for (const line of separatedEffectClauses(text).split(/\r?\n/)) {
    const standalone = /^(?:[ \t]*(?:＜[^＞\r\n]+＞|<[^>\r\n]+>))+[ \t]*$/.test(line);
    if (standalone && previousWasKeyword) lines[lines.length - 1] += ` ${line.trim()}`;
    else lines.push(standalone ? line.trim() : line);
    previousWasKeyword = standalone;
  }
  return lines.join("\n");
}

const htmlEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const timingLabel =
  "(?:On Play|When Digivolving|When Attacking|On Deletion|Your Turn|Opponent's Turn|All Turns|Main|Security|Hand|Counter|Rule|Breeding|(?:At )?(?:Start|End) of [^\\]]+)";
const gluedTimingMarker = new RegExp(`(\\w)(?=\\[${timingLabel}\\])`, "gi");
const timingMarkerAfterNameMarker = new RegExp(
  `(\\[(?!${timingLabel}\\])[^\\]\\r\\n]+\\])[ \\t]+(?=\\[${timingLabel}\\])`,
  "gi",
);

/** Some card data glues timing markers to the previous sentence and keeps raw HTML entities. */
export function separatedEffectClauses(text: string): string {
  return text
    .replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (entity, decimal, hex, name) => {
      if (decimal || hex) {
        const codePoint = decimal ? Number(decimal) : parseInt(hex, 16);
        return codePoint === 160 ? " " : String.fromCodePoint(codePoint);
      }
      return htmlEntities[name.toLowerCase()] ?? entity;
    })
    .replace(/([.)＞>])[ \t]*(?=\[)/g, "$1\n")
    .replace(gluedTimingMarker, "$1\n")
    .replace(timingMarkerAfterNameMarker, "$1\n");
}
