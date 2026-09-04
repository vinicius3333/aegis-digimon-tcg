import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-035.js";

describe("EX6-035 Cherubimon", () => {
  it("has Blast Digivolve and Alliance and plays a level 4 or lower yellow/green Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("reduces an opposing Digimon by 4000 per other allied Digimon on play and digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      scaling: { per: 1, unit: "cards", filter: { excludeSelf: true } },
    }));
  it("publicly plays a level-3 yellow Digimon from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-035", as: "cherub" }], hand: [{ card: "EX6-016", as: "rookie" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 4000 for one other allied Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("publicly applies the same scaled reduction when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cherub"));
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });
});
