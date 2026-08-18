import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-107.js";

describe("BT10-107 Buzzing Fist", () => {
  it("adds one revealed Bagra Army card, trashes the rest, then places another under Yuu Amano", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-093", as: "yuu" }],
          hand: [{ card: "BT10-107", as: "option" }],
          deck: [
            { card: "BT10-073", as: "addedBagra" },
            { card: "BT10-075", as: "placedBagra" },
            { card: "BT10-001", as: "remainder" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("addedBagra").instanceId, s.inst("placedBagra").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("yuu").stack.some((card) => card.instanceId === s.inst("placedBagra").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("addedBagra").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("remainder").instanceId]),
    );
    expect(s.perm("yuu").stack.map((card) => card.instanceId)).toContain(s.inst("placedBagra").instanceId);
  });

  it("Security plays Yuu Amano from trash and returns Buzzing Fist to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT10-107", as: "option", faceUp: true }],
          trash: [{ card: "BT10-093", as: "yuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.instanceId === s.inst("yuu").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("may decline both the revealed Bagra Army card and the later placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-093", as: "yuu" }],
        hand: [{ card: "BT10-107", as: "option" }],
        deck: [
          { card: "BT10-073", as: "firstBagra" },
          { card: "BT10-075", as: "secondBagra" },
          { card: "BT10-001", as: "remainder" },
        ],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const revealChoice = s.state.pendingDecision!;
    expect(JSON.parse(revealChoice.payloadJson)).toMatchObject({ min: 0, max: 1 });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: revealChoice.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstBagra").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstBagra").instanceId)).toBe(false);
    expect(s.perm("yuu").stack).toHaveLength(0);
  });
});
