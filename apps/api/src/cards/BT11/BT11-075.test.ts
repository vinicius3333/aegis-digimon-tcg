import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-075.js";
describe("BT11-075 DoKunemon", () => {
  it("maps the vanilla catalog facts to empty IR", () => {
    expect(getCardDefinition("BT11-075")).toMatchObject({
      cardId: "BT11-075",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 4000,
      types: ["Larva"],
    });
    expect(compiled).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });

  it("registers the vanilla card", () => {
    expect(getEffectModule("BT11-075")).toBeDefined();
    expect(runtimeCompiledCard("BT11-075")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });

  it("digivolves from a purple level 2 for 0 without opening an effect", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-008", as: "egg" },
        hand: [{ card: "BT11-075", as: "dokunemon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("dokunemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT11-075");

    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
