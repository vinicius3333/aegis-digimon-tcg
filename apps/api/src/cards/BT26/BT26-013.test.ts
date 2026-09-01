import { digivolutionRequirementsFor, EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-013.js";
import "../index.js";

describe("BT26-013 Musyamon", () => {
  it("compiles Blocker, both trash-to-delete triggers, and inherited DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([
      ["Static", undefined],
      ["OnPlay", undefined],
      ["OnDeletion", undefined],
      ["YourTurn", true],
    ]);
    expect(compiled.effects.slice(1, 3).map((effect) => effect.actions[0])).toEqual([
      expect.objectContaining({ kind: "Delete", allowCostWithoutTarget: true }),
      expect.objectContaining({ kind: "Delete", allowCostWithoutTarget: true }),
    ]);
  });

  it("uses the exact Shambala/TS evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT26-013")).toContainEqual({
      level: 3,
      traits: ["Shambala", "TS"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("digivolves for 2 over an off-color TS Lv.3 and rejects a non-trait peer", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "tsEgg" },
        hand: [
          { card: "BT24-019", as: "tsBase" },
          { card: "BT26-013", as: "musyamon" },
        ],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("tsBase").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT24-019");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);

    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("musyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT26-013");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002", "BT24-019"]);
    expect(legal.state.memory).toBe(0);

    legal.state.phase = Phase.Breeding;
    expect(
      legal.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: legal.perm("tsEgg").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.phase === Phase.Main && legal.perm("tsEgg").topCard.cardId === "BT26-013");

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "plainBlue" }],
        hand: [{ card: "BT26-013", as: "musyamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainBlue").permanentId,
        instanceId: illegal.inst("musyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("also digivolves for 2 over a Shambala-only Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-061", as: "shambalaBase" }],
        hand: [{ card: "BT26-013", as: "musyamon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shambalaBase").permanentId,
        instanceId: s.inst("musyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shambalaBase").topCard.cardId === "BT26-013");
    expect(s.state.memory).toBe(0);
  });

  it("trashes one hand card and deletes an opponent Digimon at 6000 DP or less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-013", as: "self" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT26-012", as: "target", dp: 6000 },
            { card: "BT26-014", as: "safe", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-014");
  });

  it("resolves the same paid deletion when Musyamon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "self" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT26-012", as: "target", dp: 6000 },
            { card: "BT26-014", as: "safe", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const selfId = s.perm("self").topCard.instanceId;
    const safeId = s.perm("safe").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([selfId, s.inst("cost").instanceId]),
    );
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(safeId);
  });

  it("may pay the trash cost even when no opponent Digimon is within 6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "self" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT26-014", as: "safe", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("self"));

    // CR §15-7-5 allows an optional processing condition to be paid even when the
    // processing after it cannot do anything.
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("publishes Blocker while Musyamon is the stack's top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-013", as: "self" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
  });

  it("may decline the optional hand-trash payment without deleting a legal target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "self" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT26-012", as: "target", dp: 6000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("self"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("target").instanceId,
    ]);
  });

  it("applies inherited +2000 DP only on the owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-013", as: "source" }] }] },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(9000);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-013" }] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(7000);
  });
});
