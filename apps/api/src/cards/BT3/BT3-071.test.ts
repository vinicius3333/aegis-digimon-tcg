import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-071.js";

describe("BT3-071 MetalMamemon", () => {
  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-071", as: "metalMamemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("metalMamemon"), "Reboot")).toBe(true);
  });

  it("returns exactly one level 7 Virus Digimon from trash on legal evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-066", as: "base" }],
          hand: [{ card: "BT3-071", as: "evolving" }],
          trash: [
            { card: "BT2-083", as: "virusLevel7" },
            { card: "BT3-075", as: "wrongLevelAndAttribute" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("virusLevel7").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("virusLevel7").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongLevelAndAttribute").instanceId)).toBe(true);
  });
});
