import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-111.js";

describe("BT6-111 Alphamon", () => {
  it("battles in security, then returns to hand and restricts opposing Digimon from attacking players", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-016", as: "royalKnight" }],
        security: [{ card: "BT6-111", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }, { card: "BT1-014", as: "restricted" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    const securityInstanceId = s.inst("security").instanceId;
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;

    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
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
    const candidateIds = [
      s.perm("firstChoice").permanentId,
      s.perm("secondChoice").permanentId,
    ];

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "chooseTargets" && latest.sourceCardId === "BT6-111";
    });

    const decision = s.decisions.at(-1)!.req;
    expect(decision.kind).toBe("chooseTargets");
    expect(decision.options).toMatchObject({ min: 0, max: 2 });
    expect(decision.options?.candidateInstanceIds).toEqual(candidateIds);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).isRestricted(s.perm("firstChoice"), "attackPlayers")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("secondChoice"), "attackPlayers")).toBe(false);
  });

  it("Q1496 restricts future declarations without ending the current multi-check attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-016", as: "royalKnight" }],
        security: [
          { card: "BT6-111", as: "alphamonSecurity" },
          { card: "BT1-001", as: "secondSecurity" },
        ],
      },
      1: { battleArea: [{ card: "BT5-085", as: "attacker" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    (s.engine as unknown as {
      primitives: { grantKeyword(id: string, keyword: string, duration: string, amount: number): void };
    }).primitives.grantKeyword(
      s.perm("attacker").permanentId,
      "SecurityAttack",
      "permanent",
      1,
    );
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("pays 5 memory for +5000 DP when attacking, then gains 2 at attack end", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-111", as: "alphamon" }] }, 1: { security: ["BT1-101"] } }, { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 5 });
    const startingDP = s.perm("alphamon").currentDP;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("alphamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
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

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(4);
  });
});
