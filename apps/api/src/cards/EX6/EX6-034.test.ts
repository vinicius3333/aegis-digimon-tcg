import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-034.js";

describe("EX6-034 Antylamon", () => {
  it("has Alliance and plays a level 3 yellow or green Digimon on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levels: [3] } },
    });
  });
  it("inherits once-per-turn Beast revival by returning another suspended Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          cost: { kind: "return", target: { filter: { excludeSelf: true, suspended: true } } },
        },
      ],
    }));
  it("publicly plays a level-3 yellow Digimon from hand when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-034", as: "anty" }], hand: [{ card: "EX6-016", as: "rookie" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("anty"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId)).toBe(true);
  });

});
