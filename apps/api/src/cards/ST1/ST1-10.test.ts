import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("ST1-10 Phoenixmon", () => {
  it("is a vanilla level 6 red Digimon with its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST1-10"] } });
    await s.ready();
    const card = getCardDefinition("ST1-10")!;
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(card.dp);
    expect(card.level).toBe(6);
    expect(card.colors).toEqual(["Red"]);
    expect(card.effectText).toBeUndefined();
    expect(card.inheritedEffectText).toBeUndefined();
  });
});
