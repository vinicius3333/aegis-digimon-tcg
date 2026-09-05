import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-014.js";

describe("EX6-014 Huankunmon", () => {
  it("plays a blue level 3 card from a blue Digimon's stack on play or digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        payCost: false,
        optional: true,
        target: { filter: { controller: "mine", colors: ["Blue"], levels: [3], hostFilter: { colors: ["Blue"] } } },
      });
    }
  });
  it("inherits a once-per-turn blue Digimon placement cost to unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            targetIsPermanent: true,
          },
        },
      ],
    });
  });

  it("publicly plays a blue level-3 card from its blue stack host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-014", as: "huan", under: [{ card: "BT1-027", as: "source" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("huan"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    ).toBe(true);
  });

  it("publicly places another blue Digimon under the host to unsuspend it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "host", under: ["EX6-014"], suspended: true },
            { card: "BT1-027", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });
});
