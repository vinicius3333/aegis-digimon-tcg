import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-027.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-027", () => {
  it.each([false, true])(
    "lets the attack finish when sacrifice is unavailable or declined (other ally: %s)",
    async (hasAlly) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT8-041", as: "host", under: ["EX9-027"] },
              ...(hasAlly ? [{ card: "BT1-009", as: "fodder" }] : []),
            ],
            security: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT1-037", as: "attacker" }] },
        },
        { autoDeclineOptional: hasAlly, autoAcceptOptional: !hasAlly, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();

      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
        hasAlly ? ["BT8-041", "BT1-009"] : ["BT8-041"],
      );
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-027"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("cannot end the attack when its other Digimon cannot be deleted (Q4779)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-041", as: "host", under: ["EX9-027"] },
            { card: "BT7-062", as: "fodder" },
          ],
          hand: [{ card: "BT7-064", as: "evo" }, "BT7-062"],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-037", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fodder").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).isRestricted(s.perm("fodder"), "beDeleted")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT8-041", "BT7-064"]);
    expect(s.perm("fodder").stack.map(({ cardId }) => cardId)).toEqual(["BT7-062", "BT7-062"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ends an immune attack because ending changes timing rather than affecting the attacker (Q4781)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-041", as: "host", under: ["EX9-027"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX5-074", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("attacker"), "beAffected", "Digimon")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT8-041"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays to stop only the first of two attacks during the same opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-041", as: "host", under: ["EX9-027"] },
            { card: "BT1-009", as: "firstFodder" },
            { card: "BT1-016", as: "secondFodder" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "firstAttacker" },
            { card: "BT1-037", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    for (const [index, attacker] of ["firstAttacker", "secondAttacker"].entries()) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.security).toHaveLength(2 - index);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT8-041", "BT1-016"]);
    }
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives an opposing Digimon -4000 DP on digivolving or deletion by trashing a hand card", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -4000,
            duration: "forTheTurn",
            cost: { kind: "trash", target: { filter: { zone: "hand" } } },
          },
        ],
      });
    }
  });
  it("inherits once-per-turn attack prevention by deleting another own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack", cost: { kind: "deleteOwn" } }],
        },
      ],
    });
  });

  it("trashes the hand card and reduces only one opposing Digimon after a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-048", as: "source" }],
          hand: [{ card: "EX9-027", as: "evo" }, "BT1-009"],
          deck: ["BT1-046", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "target" },
            { card: "BT1-037", as: "peer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-027");
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-048", faceUp: true },
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.perm("peer").currentDP).toBe(6000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "BT1-048", alternate: false, legal: true, cost: 3 },
    { base: "BT2-067", alternate: false, legal: true, cost: 3 },
    { base: "BT7-007", alternate: true, legal: true, cost: 2 },
    { base: "BT1-009", alternate: true, legal: false, cost: 0 },
  ])(
    "checks the evolution route from $base and preserves a declined hand payment",
    async ({ base, alternate, legal, cost }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "source" }],
            hand: [{ card: "EX9-027", as: "evo" }, "BT1-009"],
            deck: ["BT1-046"],
          },
          1: { battleArea: [{ card: "BT1-037", as: "target" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: alternate,
        }).ok,
      ).toBe(legal);
      await settle();
      expect(s.perm("source").topCard.cardId).toBe(legal ? "EX9-027" : base);
      expect(s.perm("source").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual(
        legal ? [{ cardId: base, faceUp: true }] : [],
      );
      expect(s.state.memory).toBe(5 - cost);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
        legal ? ["BT1-009", "BT1-046"] : ["EX9-027", "BT1-009"],
      );
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(legal ? [] : ["BT1-046"]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.perm("target").currentDP).toBe(6000);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("deletes another Digimon and ends an opponent's attack before the security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-041", as: "host", under: ["EX9-027"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("resolves the On Deletion hand cost only when accepted (%s)", async (accept) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-009"], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-037", as: "target" }] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      accept ? ["EX9-027", "BT1-009"] : ["EX9-027"],
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(accept ? [] : ["BT1-009"]);
    expect(s.perm("target").currentDP).toBe(accept ? 2000 : 6000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
