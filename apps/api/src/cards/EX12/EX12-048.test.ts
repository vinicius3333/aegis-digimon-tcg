import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-048.js";
import "../index.js";

describe("EX12-048 SeitenGokuumon", () => {
  it("maps evolution, Assembly, keywords, scaled target reduction, and leave-play replacement", () => {
    expect(digivolutionRequirementsFor("EX12-048")).toEqual([
      { level: 5, texts: ["Gokuumon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        materials: [{ count: 3, names: ["Gokuumon", "Sangomon", "Cho-Hakkaimon", "Sanzomon"], differentNames: true }],
        reduceCost: 6,
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      {
        trigger: "Static",
        actions: [],
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "ModifyDP", amount: -8000, duration: "untilOpponentTurnEnd" },
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "untilOpponentTurnEnd",
            scaling: { per: 1, filter: { levels: [5] }, unit: "digivolutionCards" },
            target: { sameTarget: true },
          },
          { kind: "Attack", optional: true, withoutSuspending: false },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("applies -8000 plus -3000 for each level-5 stack card to the selected opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", dp: 50000, under: ["BT1-020", "BT1-024"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 40000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();

    expect(s.perm("opponent").currentDP).toBe(26000);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-020", "BT1-024"]);
  });

  it("plays up to two eligible level-5 cards from its own stack when removed by an opponent effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", under: ["EX12-015", "EX12-029"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX12-015", "EX12-029"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-048")).toBe(false);
  });

  it("does not play stack cards when its controller's own effect removes it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", under: ["EX12-015", "EX12-029"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
