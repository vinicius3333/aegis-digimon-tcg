import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-188.js";

describe("P-188 DemiVeemon", () => {
  it("draws once per turn when one of your blue Tamers is played", () => {
    expect(runtimeCompiledCard("P-188")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("draws when a blue Tamer is played under its live host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["P-188"] }],
        hand: [{ card: "BT1-086", as: "tamer" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
