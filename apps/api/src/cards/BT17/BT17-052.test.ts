import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-052.js";
import "./index.js";

describe("BT17-052 Agumon", () => {
  it("once per turn gains memory and draws when your Kosuke Kisakata is played", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] },
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "Draw", controller: "mine", amount: 1 },
          ],
        },
      ],
    });
  });

  it("has Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
    ]);
  });

  it("gains memory and draws when Kosuke Kisakata is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        hand: [{ card: "BT16-087", as: "kosuke" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 4;
    const drawnId = s.inst("drawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kosuke").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.memory).toBe(1);
  });

  it("grants inherited Reboot to an evolved host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-055", under: ["BT17-052"], as: "host" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
