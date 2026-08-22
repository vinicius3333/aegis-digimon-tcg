import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-10.js";

describe("ST2-10 Plesiomon", () => {
  it("is registered as complete vanilla IR with catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-10"] } });
    await s.ready();
    const definition = getCardDefinition("ST2-10")!;
    const permanent = s.state.players[0]!.battleArea[0]!;

    expect(permanent.topCard.cardId).toBe(definition.cardId);
    expect(permanent.baseDP).toBe(definition.dp);
    expect(permanent.currentDP).toBe(definition.dp);
    expect(definition.level).toBe(6);
    expect(definition.playCost).toBe(10);
    expect(definition.colors).toEqual(["Blue"]);
    expect(definition.types).toEqual(["Plesiosaur"]);
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(getCompiledCard("ST2-10")!.effects).toEqual([]);
    expect(getCompiledCard("ST2-10")!.coverage).toBe("full");
    expect(getCompiledCard("ST2-10")!.residual).toEqual([]);
  });
});
