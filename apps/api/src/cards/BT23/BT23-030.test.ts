import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-030.js";

describe("BT23-030 Etemon", () => {
  it("declares Alliance", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn pays 1 cost before optionally playing an eligible card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          playCostLte: 3,
          nameOrTrait: [
            { tokens: ["Chuumon", "Sukamon"], match: "name" },
            { tokens: ["CS"], match: "trait" },
          ],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      cost: { kind: "payMemory", memory: 1 },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("gives the same level 3-or-higher Digimon both Reboot and Blocker", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions;
    expect(actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, target: { count: 1 } });
    expect(actions[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: 1, sameTarget: true },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects.filter((entry) => entry.isInherited)).toHaveLength(0);
  });
});
