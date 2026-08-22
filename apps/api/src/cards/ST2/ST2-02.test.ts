import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-02.js";

describe("ST2-02 Gomamon", () => {
  it("is registered as complete vanilla IR with catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-02"] } });
    await s.ready();
    const definition = getCardDefinition("ST2-02")!;
    const permanent = s.state.players[0]!.battleArea[0]!;

    expect(permanent.topCard.cardId).toBe(definition.cardId);
    expect(permanent.baseDP).toBe(definition.dp);
    expect(permanent.currentDP).toBe(definition.dp);
    expect(definition.level).toBe(3);
    expect(definition.playCost).toBe(2);
    expect(definition.colors).toEqual(["Blue"]);
    expect(definition.types).toEqual(["Sea Beast"]);
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(getCompiledCard("ST2-02")!.effects).toEqual([]);
    expect(getCompiledCard("ST2-02")!.coverage).toBe("full");
    expect(getCompiledCard("ST2-02")!.residual).toEqual([]);
  });
});
