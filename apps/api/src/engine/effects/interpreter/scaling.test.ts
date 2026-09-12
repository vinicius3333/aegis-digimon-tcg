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

describe("source live DP scaling", () => {
  it.each([
    [0, 0],
    [4999, 0],
    [5000, 1],
    [9999, 1],
    [10000, 2],
    [14999, 2],
    [15000, 3],
    [-1000, 0],
  ])("counts whole units at %i DP", (dp, units) => {
    const ctx = {
      source: { permanent: () => ({ permanentId: "source", currentDP: dp }) },
      game: {},
      trigger: {},
    } as unknown as EffectContext;
    expect(scaleFactor(ctx, { per: 5000, unit: "selfDP" })).toBe(units);
  });
  it("reads authoritative effective DP instead of a stale projection", () => {
    const ctx = {
      source: { permanent: () => ({ permanentId: "source", currentDP: 7000 }) },
      game: { effectiveDP: (id: string) => (id === "source" ? 15000 : 0) },
      trigger: {},
    } as unknown as EffectContext;
    expect(scaleFactor(ctx, { per: 5000, unit: "selfDP" })).toBe(3);
  });
  it("contributes no units after the source has left", () => {
    const ctx = { source: { permanent: () => undefined }, game: {}, trigger: {} } as unknown as EffectContext;
    expect(scaleFactor(ctx, { per: 5000, unit: "selfDP" })).toBe(0);
  });
});
