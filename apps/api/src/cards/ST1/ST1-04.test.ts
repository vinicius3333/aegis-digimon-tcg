import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-04.js";

describe("ST1-04 Dracomon", () => {
  it("is a vanilla level 3 red Digimon with its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST1-04"] } });
    await s.ready();
    const card = getCardDefinition("ST1-04")!;
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(card.dp);
    expect(card.level).toBe(3);
    expect(card.playCost).toBe(3);
    expect(card.dp).toBe(4000);
    expect(card.colors).toEqual(["Red"]);
    expect(card.evoCosts).toEqual([{ color: "Red", level: 2, memoryCost: 0 }]);
    expect(card.effectText).toBeUndefined();
    expect(card.inheritedEffectText).toBeUndefined();
    expect(card.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });
});
