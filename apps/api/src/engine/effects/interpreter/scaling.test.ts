import { describe, expect, it } from "vitest";
import type { EffectContext } from "../EffectContext.js";
import { scaleFactor } from "./scaling.js";

function card(instanceId: string, cardId: string) {
  return { instanceId, cardId, ownerSeat: 0, faceUp: true };
}

function context(trash: ReturnType<typeof card>[], sourceInstanceId: string): EffectContext {
  const definitions = new Map([
    ["SOURCE", { cardId: "SOURCE", nameEn: "Sourcemon" }],
    ["DUPLICATE", { cardId: "DUPLICATE", nameEn: "Qualifyingmon" }],
    ["OTHER", { cardId: "OTHER", nameEn: "Othermon" }],
  ]);
  const players = [{ trash }, { trash: [] }];
  return {
    source: { instanceId: sourceInstanceId, ownerSeat: 0 },
    game: {
      player: (seat: 0 | 1) => players[seat],
      opponentOf: () => 1,
      definitionOf: (instance: { cardId: string }) => definitions.get(instance.cardId),
    },
  } as unknown as EffectContext;
}

describe("trash scaling identity filters", () => {
  it("deduplicates matching trash cards by printed name and excludes the source instance", () => {
    const ctx = context(
      [card("source", "SOURCE"), card("copy1", "DUPLICATE"), card("copy2", "DUPLICATE"), card("other", "OTHER")],
      "source",
    );

    expect(
      scaleFactor(ctx, {
        per: 1,
        unit: "trash",
        filter: { controller: "mine", distinctNames: true, excludeSelf: true },
      }),
    ).toBe(2);
  });

  it("excludes only the source instance when uniqueness is not requested", () => {
    const ctx = context(
      [card("source", "DUPLICATE"), card("copy1", "DUPLICATE"), card("copy2", "DUPLICATE"), card("other", "OTHER")],
      "source",
    );

    expect(
      scaleFactor(ctx, {
        per: 1,
        unit: "trash",
        filter: { controller: "mine", excludeSelf: true },
      }),
    ).toBe(3);
  });
});
