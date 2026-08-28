import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST3-02.js";

describe("ST3-02 Salamon", () => {
  it("matches its vanilla catalog contract and legally digivolves from a yellow level 2", async () => {
    const definition = getCardDefinition("ST3-02")!;
    expect(definition).toMatchObject({
      cardId: "ST3-02",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 2,
      dp: 3000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      types: ["Mammal"],
    });
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });

    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-01", as: "base" }],
        hand: [{ card: "ST3-02", as: "evolving" }],
        deck: ["BT1-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST3-02");
    expect(s.perm("base").baseDP).toBe(3000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST3-01"]);
  });
});
