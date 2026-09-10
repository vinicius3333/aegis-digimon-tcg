import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT1-009.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-009 Monodramon", () => {
  it("matches the catalog and has no effects", () => {
    expect(getCardDefinition("BT1-009")).toMatchObject({
      cardId: "BT1-009",
      nameEn: "Monodramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 2,
      dp: 3000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mini Dragon"],
    });
    expect(getCardDefinition("BT1-009")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-009")?.inheritedEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 2 memory as a 3000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-009", as: "monodramon" }] } });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("digivolves from a red level 2 for 0 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "BT1-009", as: "monodramon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("monodramon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("base")).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects digivolving from a non-red level 2", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-007", as: "base" }],
        hand: [{ card: "BT1-009", as: "monodramon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
