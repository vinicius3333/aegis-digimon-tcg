import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-050.js";
import "../index.js";

const CARD_ID = "EX10-050";

describe("EX10-050 Baalmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Free"],
      types: ["Wizard", "Bagra Army"],
    });
  });

  it("proves trash thresholds, deletion Beelzemon play, inherited DP scaling, and alternate evolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Wizard"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 3 },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Reboot" },
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 },
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 10 },
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Beelzemon"], match: "name" }] }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", scaling: { per: 10, unit: "trash" } }],
    });
  });

  it("mills from 2 to 5 trash cards, then gains Reboot and Blocker through the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "baalmon" }],
        deck: ["BT1-009", "BT1-010", "BT1-009"],
        trash: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("baalmon"));
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Blocker")).toBe(true);
  });

  it("Q5133 counts the deleted four-card stack and plays Beelzemon at the resulting 10-card threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baalmon", under: ["BT1-009", "BT1-010", "BT1-009"] }],
          trash: [{ card: "EX10-074", as: "beelzemon" }, ...Array.from({ length: 5 }, () => "BT1-009")],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("baalmon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("beelzemon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("beelzemon").instanceId,
    );
  });

  it("the realistic inherited stack gains +1000 DP per complete 10 trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-074", as: "host", under: [{ card: CARD_ID, as: "baalmon" }] }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(getCardDefinition("EX10-074")!.dp! + 2000);
  });
});
