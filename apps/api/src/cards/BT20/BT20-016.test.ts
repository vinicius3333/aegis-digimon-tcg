import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./BT20-016.js";

describe("BT20-016 Paildramon", () => {
  it("gives one Digimon Piercing and +4000 before optionally attacking on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            duration: "forTheTurn",
            target: { bindAs: "paildramonBoostTarget" },
          },
          {
            kind: "ModifyDP",
            amount: 4000,
            duration: "forTheTurn",
            target: { fromSelectionRef: "paildramonBoostTarget" },
          },
          { kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "name" }] },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: { count: 2 },
              into: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("on play gives one bound ally Piercing and +4000 while allowing the Paildramon attack to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", dp: 1000, as: "ally" }],
          hand: [{ card: "BT20-016", as: "paildramon" }],
        },
        1: { security: ["BT20-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paildramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 5000);
    const paildramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-016")!;
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(5000);
    expect(paildramon.isSuspended).toBe(false);
  });

  it("provides inherited Security Attack +1 from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-020", as: "host", under: ["BT20-016"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("replaces Paildramon's deletion by DNA digivolving it and Dinobeemon into Dragon Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const paildramonId = s.perm("paildramon").permanentId;
    const dinobeemonId = s.perm("dinobeemon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([paildramonId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));

    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paildramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinobeemonId)).toBe(false);
    expect(dragonMode.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
  });
});
