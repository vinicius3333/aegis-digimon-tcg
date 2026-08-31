import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-027.js";

describe("EX4-027 GoldVeedramon", () => {
  it("has Armor Purge", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({
      keyword: "Armor Purge",
    });
  });

  it("reduces one opposing Digimon then restricts one at 6000 DP or less", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -2000 });
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
  });
  it("gates the restriction on a blue/yellow Tamer or Armor Form trash card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      condition: {
        kind: "or",
        conditions: [
          { kind: "youHave", filter: { colors: ["Blue", "Yellow"] } },
          { kind: "youHave", filter: { nameOrTrait: [{ match: "trait", tokens: ["Armor Form"] }] } },
        ],
      },
    });
  });

  it("requires the exact Veemon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Veemon"], cost: 2 }]);
  });

  it("applies the DP loss at the 6000-DP restriction boundary after a real evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST8-04", as: "veemon" },
            { card: "ST21-12", as: "blueTamer" },
          ],
          hand: [{ card: "EX4-027", as: "goldVeedramon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "boundary", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("goldVeedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boundary").currentDP === 4000);

    expect(s.perm("boundary").currentDP).toBe(4000);
    expect(s.state.memory).toBe(0);
  });
});
