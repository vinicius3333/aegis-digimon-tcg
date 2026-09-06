import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-030.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-030", () => {
  it.each([false, true])("Q4784 offers optional payment from security for free (faceUp=%s)", async (faceUp) => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX9-030", as: "source", faceUp }], hand: ["EX9-023"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    await advance(s.engine).verb.playFromSecurity(s.inst("source").instanceId);
    await settle();
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-030");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["EX9-023"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("digivolves from a legal yellow level four, places the cost at the bottom and expires after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host" }],
          hand: [{ card: "EX9-030", as: "evo" }],
          trash: ["BT1-009"],
          deck: ["BT1-048", "BT1-049", "BT1-050"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }], deck: ["BT1-048", "BT1-049"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(6);
    expect(s.perm("host").topCard.cardId).toBe("EX9-030");
    expect(s.perm("host").stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-009", false],
      ["BT1-051", true],
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
    expect(s.perm("target").currentDP).toBe(5000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("explicitly declines both optional costs on real play without discarding or reducing DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-030", as: "source" }, "EX9-023"], trash: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-023"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("reduces its play cost by 2 by trashing a Cyborg or Ver.3 card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            { kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, cost: { kind: "trash" } },
          ],
        },
      ],
    });
  });
  it("on play or digivolution gives an opposing Digimon -3000 DP and loses 2000 DP per digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
          {
            kind: "ModifyDP",
            amount: -2000,
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, sameTarget: true },
            scaling: { unit: "digivolutionCards", per: 1, filter: { faceDown: true } },
          },
        ],
      });
    }
  });
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("places a trash Digimon face down and applies the printed DP changes on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-030", as: "source", dp: 7000 }], trash: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 10000);
    const source = s.state.players[0]!.battleArea[0]!;
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.perm("target").currentDP).toBe(5000);
    await s.ready();
    expect(source.currentDP).toBe(7000);
  });

  it.each(["EX9-023", "BT1-024"])(
    "trashes independent Ver.3/Cyborg payment %s and reduces play cost by exactly 2",
    async (payment) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: payment, as: "payment" },
              { card: "EX9-030", as: "source" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const before = s.state.memory;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }).ok).toBe(true);
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-030"));

      expect(before - s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === payment)).toBe(false);
      expect(s.state.players[0]!.battleArea[0]?.stack.some((card) => card.cardId === payment && !card.faceUp)).toBe(
        true,
      );
    },
  );

  it("Q4784 can pay the optional trash when an effect plays this card for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-030", as: "source" },
            { card: "EX9-023", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    // Supply the external free-play effect while preserving the real payment and On Play lifecycle.
    await advance(s.engine).verb.playInstances([s.inst("source").instanceId]);
    await settle();
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-030");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["EX9-023"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("cannot consume the imminent card itself as a hand cost (free=%s)", async (free) => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-030", as: "source" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const sourceId = s.inst("source").instanceId;
    if (free) await advance(s.engine).verb.playInstances([sourceId]);
    const declared = free ? undefined : s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId });
    expect(declared).toEqual(free ? undefined : { ok: true });
    await settle();
    expect(s.state.memory).toBe(free ? 10 : 3);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("does not activate the play-cost reducer under Psychemon (free=%s)", async (free) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-030", as: "source" }, "EX9-023"] },
        1: { battleArea: [{ card: "BT8-071", as: "psychemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    if (free) await advance(s.engine).verb.playInstances([s.inst("source").instanceId]);
    const declared = free
      ? undefined
      : s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId });
    expect(declared).toEqual(free ? undefined : { ok: true });
    await settle();
    expect(s.state.memory).toBe(free ? 10 : 3);
    // ST12-03 Q755: the reduction effect cannot activate, so its cost is not paid.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-023"]);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-030");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT1-009", "BT1-001", "BT1-091"])(
    "counts face-down %s without referencing its card kind and only reduces the selected opponent",
    async (faceDownCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX9-030",
                as: "source",
                dp: 7000,
                under: [
                  { card: faceDownCard, faceUp: false },
                  { card: "BT1-051", faceUp: true },
                ],
              },
            ],
            trash: ["BT1-021"],
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "target", dp: 10000 },
              { card: "BT1-021", as: "untargeted", dp: 10000 },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
      await settle(() => s.perm("target").currentDP !== 10000);

      expect(s.perm("target").currentDP).toBe(3000);
      expect(s.perm("untargeted").currentDP).toBe(10000);
      expect(s.perm("source").currentDP).toBe(7000);
      expect(s.perm("source").stack.filter((card) => card.faceUp !== true)).toHaveLength(2);
    },
  );
});
