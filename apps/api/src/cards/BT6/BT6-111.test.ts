import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-052.js";
import "../BT4/BT4-038.js";
import "./BT6-111.js";

describe("BT6-111 Alphamon", () => {
  it("battles in security, then returns to hand and restricts opposing Digimon from attacking players", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-016", as: "royalKnight" }],
          security: [{ card: "BT6-111", as: "security" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-014", as: "restricted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const securityInstanceId = s.inst("security").instanceId;
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === securityInstanceId) &&
        observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers"),
    );

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attackerInstanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
  });

  it("offers the security restriction as an up-to target decision using permanent ids", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-016", as: "royalKnight" }],
        security: [{ card: "BT6-111", as: "security" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "attacker" },
          { card: "BT1-014", as: "firstChoice" },
          { card: "BT1-014", as: "secondChoice", under: ["BT1-001"] },
        ],
      },
    });
    s.state.turnSeat = 1;
    const candidateIds = [s.perm("firstChoice").permanentId, s.perm("secondChoice").permanentId];

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "chooseTargets" &&
        latest.sourceCardId === "BT6-111"
      );
    });

    const decision = s.decisions.at(-1)!.req;
    expect(decision.kind).toBe("chooseTargets");
    expect(decision.options).toMatchObject({ min: 0, max: 2 });
    expect(decision.options?.candidateInstanceIds).toEqual(candidateIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).isRestricted(s.perm("firstChoice"), "attackPlayers")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("secondChoice"), "attackPlayers")).toBe(false);
  });

  it("does not treat a Royal Knight in the breeding area as being in play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT6-016", as: "raisedRoyalKnight" },
          security: [{ card: "BT6-111", as: "security" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT6-111"));

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(false);
  });

  it("Q1496 restricts future declarations without ending the current multi-check attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-016", as: "royalKnight" }],
          security: [
            { card: "BT6-111", as: "alphamonSecurity" },
            { card: "BT1-001", as: "secondSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT5-085", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    (
      s.engine as unknown as {
        primitives: { grantKeyword(id: string, keyword: string, duration: string, amount: number): void };
      }
    ).primitives.grantKeyword(s.perm("attacker").permanentId, "SecurityAttack", "permanent", 1);
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("pays 5 memory for +5000 DP when attacking, then gains 2 at attack end", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT6-111", as: "alphamon" }] }, 1: { security: ["BT1-101"] } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 5 },
    );
    const startingDP = s.perm("alphamon").currentDP;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alphamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);

    expect(s.perm("alphamon").currentDP).toBe(startingDP + 5000);
    expect(s.state.memory).toBe(7);
  });

  it("does not pay memory or gain end-of-attack memory for another Digimon's attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-111", as: "alphamon" }], security: ["BT1-101"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(4);
  });

  it("digivolves from a legal black level-5 stack without changing the source permanent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-062", as: "base" }],
        hand: [{ card: "BT6-111", as: "alphamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alphamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT6-111");

    expect(s.perm("base").topCard.cardId).toBe("BT6-111");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-062"]);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT6-111 Alphamon — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;
  const attack = (s: Setup, seat: Seat, attackerAlias: string, targetAlias?: string) =>
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target:
        targetAlias === undefined
          ? { kind: "player" }
          : { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    });
  const handHas = (s: Setup, seat: Seat, instanceId: string) =>
    s.state.players[seat]!.hand.some((card) => card.instanceId === instanceId);
  const trashHas = (s: Setup, seat: Seat, instanceId: string) =>
    s.state.players[seat]!.trash.some((card) => card.instanceId === instanceId);

  it("still returns to hand and restricts attackers after losing its security battle (Q1495)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-016", as: "royalKnight" }],
          security: [{ card: "BT6-111", as: "alphamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const alphamonId = s.inst("alphamon").instanceId;
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;

    expect(attack(s, 1, "attacker")).toEqual({ ok: true });
    await settle(
      () => handHas(s, 0, alphamonId) && observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers"),
    );

    expect(trashHas(s, 1, attackerInstanceId)).toBe(false);
    expect(trashHas(s, 0, alphamonId)).toBe(false);
    expect(handHas(s, 0, alphamonId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
  });

  it("lets a restricted <Piercing> Digimon still check security after deleting a Digimon (Q1497)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT14-052", as: "piercer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT6-016", as: "royalKnight" },
            { card: "BT1-014", as: "target", suspended: true },
          ],
          security: [{ card: "BT6-111", as: "alphamon" }, "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const alphamonId = s.inst("alphamon").instanceId;
    const targetInstanceId = s.perm("target").topCard.instanceId;

    expect(attack(s, 0, "firstAttacker")).toEqual({ ok: true });
    await settle(() => handHas(s, 1, alphamonId) && observe(s.engine).isRestricted(s.perm("piercer"), "attackPlayers"));
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(attack(s, 0, "piercer")).not.toEqual({ ok: true });

    expect(attack(s, 0, "piercer", "target")).toEqual({ ok: true });
    await settle(() => trashHas(s, 1, targetInstanceId) && s.state.players[1]!.security.length === 1);

    expect(s.perm("piercer").topCard.cardId).toBe("BT14-052");
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not stop a <Rush> Digimon played after the effect from attacking players (Q1498)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-014", as: "alreadyInPlay" },
          ],
          hand: [{ card: "BT4-038", as: "rusher" }],
        },
        1: {
          battleArea: [{ card: "BT6-016", as: "royalKnight" }],
          security: [{ card: "BT6-111", as: "alphamon" }, "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 10;
    const alphamonId = s.inst("alphamon").instanceId;

    expect(attack(s, 0, "firstAttacker")).toEqual({ ok: true });
    await settle(
      () => handHas(s, 1, alphamonId) && observe(s.engine).isRestricted(s.perm("alreadyInPlay"), "attackPlayers"),
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rusher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT4-038"));

    expect(observe(s.engine).isRestricted(s.perm("rusher"), "attackPlayers")).toBe(false);
    expect(attack(s, 0, "alreadyInPlay")).not.toEqual({ ok: true });
    expect(attack(s, 0, "rusher")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not gain memory from [End of Attack] when deleted in its own battle (Q1499)", async () => {
    const attackInto = async (defenderDP: number) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT6-111", as: "alphamon" }] },
          1: { battleArea: [{ card: "BT1-014", as: "defender", dp: defenderDP, suspended: true }] },
        },
        { autoDeclineOptional: true, autoChooseOption: true, preferOptionIndex: 0 },
      );
      s.state.memory = 3;
      const alphamonInstanceId = s.perm("alphamon").topCard.instanceId;
      const defenderInstanceId = s.perm("defender").topCard.instanceId;
      expect(attack(s, 0, "alphamon", "defender")).toEqual({ ok: true });
      await settle(() => trashHas(s, 0, alphamonInstanceId) || trashHas(s, 1, defenderInstanceId));
      await settle();
      return { s, alphamonDeleted: trashHas(s, 0, alphamonInstanceId) };
    };

    const lost = await attackInto(20000);
    expect(lost.alphamonDeleted).toBe(true);
    expect(lost.s.state.memory).toBe(3);

    const won = await attackInto(1000);
    expect(won.alphamonDeleted).toBe(false);
    expect(won.s.state.memory).toBe(5);
  });
});
