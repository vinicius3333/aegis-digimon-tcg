import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-05.js";

describe("ST1-05 Birdramon", () => {
  it("is a vanilla level 4 red Digimon with its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST1-05"] } });
    await s.ready();
    const card = getCardDefinition("ST1-05")!;
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(card.dp);
    expect(card.level).toBe(4);
    expect(card.playCost).toBe(4);
    expect(card.dp).toBe(5000);
    expect(card.colors).toEqual(["Red"]);
    expect(card.evoCosts).toEqual([{ color: "Red", level: 3, memoryCost: 2 }]);
    expect(card.effectText).toBeUndefined();
    expect(card.inheritedEffectText).toBeUndefined();
    expect(card.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });
});
