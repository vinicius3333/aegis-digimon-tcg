import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-047.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-047", () => {
  it("declares the printed Eyesmon: Scatter Mode route as an exact-name requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Eyesmon: Scatter Mode"], cost: 1, isAlternate: true },
    ]);
  });

  it("Collision forces a non-Blocker to block without allowing direct attacks on unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-047", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender" }], security: ["BT1-001"] },
    });
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;
    const blockerPermanentId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: blockerPermanentId },
      }).ok,
    ).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      mustBlock: true,
      eligibleBlockerIds: [blockerPermanentId],
    });
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Rush and Collision and returns a Negamon-text Digimon from trash on deletion", () => {
    expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(
      expect.arrayContaining([
        { keyword: "Rush", raw: "＜Rush＞" },
        { keyword: "Collision", raw: "＜Collision＞" },
      ]),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } },
        },
      ],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("returns a Negamon-text Digimon from trash to hand on deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-047", as: "source" }],
          trash: [
            { card: "BT1-009", as: "nonmatch" },
            { card: "EX9-005", as: "egg" },
            { card: "EX9-054", as: "eligible" },
          ],
        },
        1: { trash: [{ card: "EX9-054", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["nonmatch", "egg", "opponent", "eligible"].map((alias) => s.inst(alias).instanceId));
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle();
    expect(player.hand.map(({ cardId }) => cardId)).toEqual(["EX9-054"]);
    expect(player.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-005", "EX9-047"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-054"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can attack the turn it is played through Rush", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-047", as: "rush" }] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rush").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("rush").topCard.cardId === "EX9-047");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rush").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("rush").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the deletion rescue, leaving the target in trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-047", as: "source" }], trash: ["EX9-054"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-054", "EX9-047"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits +1000 DP after legal evolution across both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-047", as: "host" }],
        hand: [{ card: "BT10-064", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT10-064");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-047"]);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(9000);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(9000);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-048", "BT10-062"])(
    "permits the cost-1 level-4 route only from Eyesmon Scatter Mode: %s",
    async (base) => {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-047", as: "evo" }], deck: ["BT1-009"] },
      });
      s.state.memory = 5;
      await s.ready();
      const eligible = base === "EX9-048";
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(eligible);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-047" : base);
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
      expect(s.state.memory).toBe(eligible ? 4 : 5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
