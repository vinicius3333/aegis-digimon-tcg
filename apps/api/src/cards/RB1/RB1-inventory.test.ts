import { describe, expect, it } from "vitest";
import cards from "../../../../../packages/shared/src/cards/data/cards.json" with { type: "json" };
import { getEffectModule } from "../../engine/effects/registry.js";
import "./index.js";

describe("RB1 card implementation inventory", () => {
  it("has a registered implementation for every cataloged RB1 card", () => {
    const ids = cards.filter((card) => card.set === "RB1").map((card) => card.cardId);
    expect(ids).toHaveLength(33);
    for (const cardId of ids) expect(getEffectModule(cardId), cardId).toBeDefined();
  });
});
