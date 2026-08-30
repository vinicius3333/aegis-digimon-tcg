import { describe, expect, it } from "vitest";
import reppamon from "./BT1-051.js";
import seasarmon from "./BT1-052.js";
import darcmon from "./BT1-053.js";
import liamon from "./BT1-054.js";
import angemon from "./BT1-055.js";
import petermon from "./BT1-056.js";
import sirenmon from "./BT1-057.js";
import chirinmon from "./BT1-058.js";
import piximon from "./BT1-059.js";
import magnaAngemon from "./BT1-060.js";

describe("BT1-051 through BT1-060 IR coverage", () => {
  it("registers every range module with complete IR", () => {
    for (const card of [
      reppamon,
      seasarmon,
      darcmon,
      liamon,
      angemon,
      petermon,
      sirenmon,
      chirinmon,
      piximon,
      magnaAngemon,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains each printed effect clause and scope", () => {
    expect(reppamon.effects).toEqual([]);
    expect(seasarmon.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming" }],
    });
    expect(darcmon.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Yellow"] },
        },
      ],
    });
    expect(liamon.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          condition: { kind: "memoryAtLeast", value: 3, controller: "mine" },
        },
      ],
    });
    expect(angemon.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
    expect(petermon.effects[0]).toMatchObject({
      trigger: "OnPlay",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand", "trash"],
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Tinkermon"], match: "name" }] } },
        },
      ],
    });
    expect(sirenmon.effects).toEqual([]);
    expect(chirinmon.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "GainMemory", amount: 3 },
        { kind: "GainMemory", amount: -3, at: "endOfTurn" },
      ],
    });
    expect(piximon.effects).toEqual([]);
    expect(magnaAngemon.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Recover", controller: "mine", amount: 1 }],
    });
    expect(magnaAngemon.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "forTheTurn",
          scaling: { per: 3, unit: "security", filter: { controller: "mine" } },
        },
      ],
    });
  });
});
