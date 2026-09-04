import { describe, expect, it } from "vitest";
import { CardColor, CardKind, type CardDefinition, type Filter } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";
import { compiled as ex4029 } from "./EX4-029.js";
import { compiled as ex4031 } from "./EX4-031.js";
import { compiled as ex4032 } from "./EX4-032.js";
import { compiled as ex4033 } from "./EX4-033.js";
import { compiled as ex4034 } from "./EX4-034.js";
import { compiled as ex4036 } from "./EX4-036.js";
import { compiled as ex4037 } from "./EX4-037.js";

const definition = (cardId: string, colors: CardColor[]): CardDefinition => ({
  cardId,
  set: "TEST",
  nameEn: cardId,
  kinds: [CardKind.Digimon],
  colors,
  playCost: 5,
  dp: 5000,
  level: 5,
  evoCosts: [],
  maxCountInDeck: 4,
});

describe("EX4 two-color evolution seams", () => {
  it("requires exactly two colors on each printed alternate path", () => {
    const requirements = [ex4029, ex4031, ex4036, ex4037]
      .flatMap((card) => card.digivolutionRequirement ?? [])
      .filter((requirement) => requirement.colorCount !== undefined);

    expect(requirements).toHaveLength(4);
    for (const requirement of requirements) {
      expect(requirement.colorCount).toBe(2);
      expect((requirement as unknown as { multicolor?: boolean }).multicolor).toBe(true);
    }

    for (const [cardId, level] of [
      ["EX4-029", 4],
      ["EX4-031", 5],
      ["EX4-036", 4],
      ["EX4-037", 5],
    ] as const) {
      const twoColorBase = { ...definition("BASE-2C", [CardColor.Green, CardColor.Black]), level };
      const threeColorBase = {
        ...definition("BASE-3C", [CardColor.Green, CardColor.Black, CardColor.Red]),
        level,
      };
      expect(matchingAlternateDigivolutionRequirement(cardId, twoColorBase)).toBeDefined();
      expect(matchingAlternateDigivolutionRequirement(cardId, threeColorBase)).toBeUndefined();
    }
  });

  it("keeps effect-driven evolution filters exact and makes EX4-037 Green+Black conjunctive", () => {
    const visit = (action: unknown): Record<string, unknown>[] => {
      const typed = action as {
        into?: Record<string, unknown> & { filter?: Record<string, unknown> };
        target?: { filter?: Record<string, unknown> };
        actions?: unknown[];
      };
      const intoFilter = typed.into === undefined ? undefined : (typed.into.filter ?? typed.into);
      return [
        ...(intoFilter === undefined ? [] : [intoFilter]),
        ...(typed.target?.filter === undefined ? [] : [typed.target.filter]),
        ...(typed.actions ?? []).flatMap(visit),
      ];
    };
    const filters = [ex4032, ex4033, ex4034, ex4037]
      .flatMap((card) => card.effects ?? [])
      .flatMap((effect) => (effect.actions ?? []).flatMap(visit))
      .filter((filter) => filter.colorCount !== undefined);

    expect(filters.length).toBeGreaterThanOrEqual(4);
    expect(filters.every((filter) => filter.colorCount === 2 && filter.multicolor === true)).toBe(true);

    const greenBlack = {
      kinds: [CardKind.Digimon],
      colors: [CardColor.Green, CardColor.Black],
      playCost: 5,
      nameEn: "GB",
    };
    const greenOnly = { ...greenBlack, colors: [CardColor.Green] };
    const greenBlackRed = { ...greenBlack, colors: [CardColor.Green, CardColor.Black, CardColor.Red] };
    const filter: Filter = { multicolor: true, colorCount: 2, colorsAll: ["Green", "Black"] };
    expect(definitionMatches(filter, greenBlack)).toBe(true);
    expect(definitionMatches(filter, greenOnly)).toBe(false);
    expect(definitionMatches(filter, greenBlackRed)).toBe(false);
  });

  it("preserves Alliance attribution on the three inherited watchers", () => {
    for (const card of [ex4032, ex4033, ex4034]) {
      const allianceWatcher = (card.effects ?? [])
        .flatMap((effect) => effect.actions ?? [])
        .find((action) => (action as { bySourceKeyword?: string }).bySourceKeyword === "Alliance");
      expect(allianceWatcher).toMatchObject({ event: "whenEffectSuspends", bySourceKeyword: "Alliance" });
    }
  });
});
