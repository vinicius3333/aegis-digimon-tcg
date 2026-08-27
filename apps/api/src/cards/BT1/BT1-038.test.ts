import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT1-038.js";

describe("BT1-038 Monzaemon", () => {
  it("matches the vanilla catalog contract and registers residual-free IR", () => {
    expect(getCardDefinition("BT1-038")).toMatchObject({
      cardId: "BT1-038",
      nameEn: "Monzaemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Puppet"],
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT1-038")?.cardId).toBe("BT1-038");
  });

  it("plays for 5 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-038", as: "monzaemon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves from a blue level 4 for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "base" }],
        hand: [{ card: "BT1-038", as: "monzaemon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("monzaemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
