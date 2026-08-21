import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-067.js";
import "./BT18-070.js";

describe("BT18-070 RhinoKabuterimon", () => {
  it("uses its hand Main effect to place Beetlemon and MetalKabuterimon under a Tamer and digivolve it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "tamer" }],
          hand: [{ card: "BT18-070", as: "rhino" }],
          trash: [{ card: "BT18-063", as: "beetlemon" }, { card: "BT18-067", as: "metalKabuterimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("rhino").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effects).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("rhino").instanceId, effectKey: effects[0]!.effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT18-070");
    await s.ready();

    expect(s.perm("tamer").topCard?.cardId).toBe("BT18-070");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT18-067", "BT18-063", "BT18-091"]);
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });
});
