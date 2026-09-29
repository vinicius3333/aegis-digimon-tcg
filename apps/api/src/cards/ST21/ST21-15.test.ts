import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type CardSpec, findPermanent, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-15", () => {
  it("buffs level 3+ Digimon by 3000 DP while this card is face-up security", () => {
    const effect = (runtimeCompiledCard("ST21-15")?.effects ?? []).find(
      (candidate) => candidate.trigger === "YourTurn",
    );
    expect(effect).toMatchObject({ isSecurity: true });
    expect(effect?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000 });
  });
  it("exchanges the bottom security card for this card and can play a level 3 from trash", () => {
    const effects = runtimeCompiledCard("ST21-15")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "Main")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SecurityManipulation", op: "toHand" }),
        expect.objectContaining({ kind: "SecurityManipulation" }),
      ]),
    );
    expect(effects.find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
    });
  });

  it("plays a level-3 Digimon from trash when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST21-15", as: "house" }], trash: [{ card: "ST1-03", as: "rookie" }] },
        1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
  });

  it("keeps its color requirement while a face-up Gennai's House is in your security stack", async () => {
    for (const faceUp of [true, false]) {
      const s = setupEngine({
        0: { hand: [{ card: "ST21-15", as: "house" }], security: [{ card: "ST21-15", faceUp }, "ST1-03"] },
      });
      s.state.memory = 5;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("house").instanceId })).toEqual(
        faceUp ? { ok: false, reason: "color-requirement-unmet" } : { ok: true },
      );
    }
  });
});

describe("ST21-15 Gennai's House — KB Q&A rulings", () => {
  async function playHouse(security: CardSpec[], battleArea: string[] = []) {
    const s = setupEngine(
      { 0: { battleArea, hand: [{ card: "ST21-15", as: "house" }], security } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("house").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some(({ cardId }) => cardId === "ST21-15"));
    return s;
  }

  function attackIntoFaceUpHouse(opts: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean }) {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST21-15", as: "house", faceUp: true }],
          trash: [{ card: "ST1-03", as: "rookie" }],
        },
        1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
      },
      { ...opts, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("stays a revealed security card that otherwise counts as a normal security card (Q4486)", async () => {
    const s = await playHouse(
      [
        { card: "ST1-03", as: "top" },
        { card: "ST1-02", as: "bottom" },
      ],
      ["BT1-045"],
    );
    const security = s.state.players[0]!.security;

    expect(security.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["ST1-03", false],
      ["ST21-15", true],
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(findPermanent(s, 0, "BT1-045").currentDP).toBe(6000);
  });

  it("is checked while left revealed and then trashed like any security card (Q4487)", async () => {
    const s = attackIntoFaceUpHouse({ autoDeclineOptional: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "ST21-15")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["ST1-03", "ST21-15"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("activates its [Security] effect when checked face up (Q4488)", async () => {
    const s = attackIntoFaceUpHouse({ autoAcceptOptional: true });
    const rookieId = s.inst("rookie").instanceId;
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([rookieId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["ST21-15"]);
  });

  it("turns face down when the security stack is shuffled (Q4489)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045"],
          hand: [
            { card: "ST21-15", as: "house" },
            { card: "BT14-093", as: "shuffler" },
          ],
          security: ["ST1-03", "ST1-02", "ST1-02"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("house").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some(({ cardId }) => cardId === "ST21-15"));
    expect(s.state.players[0]!.security.filter(({ faceUp }) => faceUp).map(({ cardId }) => cardId)).toEqual([
      "ST21-15",
    ]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT14-093"),
    );

    const security = s.state.players[0]!.security;
    expect(security.some(({ cardId }) => cardId === "ST21-15")).toBe(true);
    expect(security.every(({ faceUp }) => faceUp === false)).toBe(true);
  });

  it("can be used with an empty security stack and only places itself there (Q4702)", async () => {
    const s = await playHouse([]);

    expect(s.state.players[0]!.security.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([["ST21-15", true]]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });
});
