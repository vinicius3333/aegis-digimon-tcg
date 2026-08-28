import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST3-10.js";

describe("ST3-10 Magnadramon", () => {
  it("matches its vanilla catalog contract and legally tops a complete yellow evolution stack", async () => {
    const definition = getCardDefinition("ST3-10")!;
    expect(definition).toMatchObject({
      cardId: "ST3-10",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 10,
      dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 2 }],
      types: ["Holy Dragon", "Four Great Dragons"],
    });
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });

    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "ST3-09",
            as: "base",
            under: ["ST3-01", "ST3-02", "ST3-06"],
          },
        ],
        hand: [{ card: "ST3-10", as: "evolving" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST3-10");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").baseDP).toBe(12000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST3-01", "ST3-02", "ST3-06", "ST3-09"]);
  });
});
