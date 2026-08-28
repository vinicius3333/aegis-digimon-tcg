import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST3-06.js";

describe("ST3-06 Gatomon", () => {
  it("matches its vanilla catalog contract and legally digivolves from a yellow level 3", async () => {
    const definition = getCardDefinition("ST3-06")!;
    expect(definition).toMatchObject({
      cardId: "ST3-06",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      types: ["Holy Beast"],
    });
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });

    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-02", as: "base", under: ["ST3-01"] }],
        hand: [{ card: "ST3-06", as: "evolving" }],
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
    await settle(() => s.perm("base").topCard?.cardId === "ST3-06");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").baseDP).toBe(5000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST3-01", "ST3-02"]);
  });
});
