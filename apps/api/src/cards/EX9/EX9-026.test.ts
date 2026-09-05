import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-026.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-026", () => {
  it("has Training and its play/digivolve effects give an opposing Digimon -3000 DP for the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "untilOpponentTurnEnd",
            alsoGainKeywords: [{ keyword: "SecurityAttack", amount: -1 }],
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
    }
  });
  it("adds the top deck card to security on deletion at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "addTop", amount: 1, condition: { kind: "zoneCount", value: 3 } }],
    });
  });
  it("inherits the same security recovery effect", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(
      expect.objectContaining({ kind: "SecurityManipulation", op: "addTop" }),
    ));

  it("places a hand card face down on play before reducing one opposing Digimon and its security attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-026", as: "source" }],
          hand: ["BT1-001"],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 5000 },
            { card: "BT1-010", as: "other", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 5000);

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("preserves a payable hand card when the optional On Play cost is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-026", as: "source" }, "BT1-001"], security: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(5);
  });

  it("recovers the top deck card only at three or fewer security", async () => {
    const atMostThree = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-026"] }],
          deck: ["BT1-001"],
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(atMostThree.engine).verb.deletePermanent([atMostThree.perm("host").permanentId]);
    expect(atMostThree.state.players[0]!.security).toHaveLength(4);
    expect(atMostThree.state.players[0]!.deck).toHaveLength(0);

    const four = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-026"] }],
          deck: ["BT1-001"],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(four.engine).verb.deletePermanent([four.perm("host").permanentId]);
    expect(four.state.players[0]!.security).toHaveLength(4);
    expect(four.state.players[0]!.deck).toHaveLength(1);
  });
});
