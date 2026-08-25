import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-052.js";
import "../index.js";

const CARD_ID = "EX10-052";

describe("EX10-052 Lucemon: Chaos Mode", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Yellow"],
      level: 5,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 7 },
        { color: "Yellow", level: 4, memoryCost: 7 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
  });

  it("proves hand-trash opponent choice, conditional Recovery, leave replacement, and alternate evolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Lucemon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            controller: "opponent",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
            optional: true,
            allowCostWithoutTarget: true,
            abortOnDecline: true,
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Delete", controller: "opponent", optional: true },
            { kind: "Prevent", mode: "leavePlay", condition: { kind: "ifThisEffectDidNotDelete" } },
          ],
        },
      ],
    });
  });

  it("pays the hand cost and recovers when the opponent cannot delete a permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lucemon"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it("does not recover when the opponent deletes one of their permanents", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "EX10-040", as: "sacrifice" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lucemon"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q5135 prevents leaving when the opponent's deletion does not delete", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "lucemon" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    await s.ready();
    const permanentId = s.perm("lucemon").permanentId;
    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toContain(permanentId);
  });

  it("allows leaving when the opponent's deletion succeeds", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lucemon" }] },
        1: { battleArea: [{ card: "EX10-040", as: "sacrifice" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lucemonId = s.perm("lucemon").permanentId;
    await advance(s.engine).verb.deletePermanent([lucemonId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === lucemonId));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(lucemonId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
