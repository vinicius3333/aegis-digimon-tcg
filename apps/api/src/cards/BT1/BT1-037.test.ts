import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT1-037.js";

describe("BT1-037 Gorillamon", () => {
  it("matches the vanilla catalog contract and registers residual-free IR", () => {
    expect(getCardDefinition("BT1-037")).toMatchObject({
      cardId: "BT1-037",
      nameEn: "Gorillamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 1 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beastkin"],
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT1-037")?.cardId).toBe("BT1-037");
  });

  it("plays for 6 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-037", as: "gorillamon" }] } });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves from a blue level 3 for 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-037", as: "gorillamon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gorillamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gorillamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
