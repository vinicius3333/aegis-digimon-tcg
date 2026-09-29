import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-07 Rika Nonaka", () => {
  it("places an eligible Option under itself, draws, and gains memory on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-07", as: "rika" }],
          hand: [{ card: "ST22-08", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rika"));
    await settle(() => s.perm("rika").stack.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.perm("rika").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself to use a cost-6 Option under it when a level-6 Sakuyamon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "BT1-009", as: "drawn" }],
          battleArea: [
            { card: "ST22-07", as: "rika", under: [{ card: "ST22-10", as: "mandala" }] },
            { card: "ST22-06", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("mandala").instanceId));

    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.perm("rika").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("mandala").instanceId)).toBe(true);
  });
});

describe("ST22-07 Rika Nonaka — KB Q&A rulings", () => {
  it("places a new card at the bottom of the cards already under it (Q5427)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-07", as: "rika", under: [{ card: "ST22-09", as: "alreadyUnder" }] }],
          hand: [{ card: "ST22-11", as: "placed" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("rika").stack.map((card) => card.instanceId)).toEqual([
      s.inst("placed").instanceId,
      s.inst("alreadyUnder").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it.each([
    { digivolvesMidAttack: true, usesCostSix: true },
    { digivolvesMidAttack: false, usesCostSix: false },
  ])(
    "reads the attacker's level when its effect activates (digivolves=$digivolvesMidAttack) (Q5428)",
    async ({ digivolvesMidAttack, usesCostSix }) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST22-07", as: "rika", under: [{ card: "ST22-10", as: "costSix" }] },
              { card: "ST22-04", as: "taomon", under: ["ST22-01"] },
            ],
            hand: [
              { card: "ST22-10", as: "usedByTaomon" },
              ...(digivolvesMidAttack ? [{ card: "BT5-044", as: "sakuyamon" }] : []),
            ],
            security: ["BT1-090"],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: { security: ["ST1-02", "ST1-02", "ST1-02"] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferTriggerKeys: ["ST22-04"],
          preferInstanceIds: preferred,
        },
      );
      preferred.push(s.inst("usedByTaomon").instanceId);
      s.state.memory = 3;
      await s.ready();
      const costSixId = s.inst("costSix").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("taomon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);

      expect(s.perm("taomon").topCard.cardId).toBe(digivolvesMidAttack ? "BT5-044" : "ST22-04");
      expect(s.perm("rika").stack.some((card) => card.instanceId === costSixId)).toBe(!usesCostSix);
      expect(s.state.players[0]!.security.some((card) => card.instanceId === costSixId)).toBe(usesCostSix);
    },
  );

  it("still activates after the attacker digivolves out of the Renamon line (Q5429)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-07", as: "rika", under: [{ card: "ST22-09", as: "plugIn" }] },
            { card: "EX11-069", as: "yuuki" },
            { card: "ST22-02", as: "attacker" },
          ],
          trash: [{ card: "BT4-039", as: "growlmon" }],
          security: ["BT1-090"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["ST1-02", "ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["EX11-069"] },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);

    const digivolveIndex = s.events.findIndex((event) => event.kind === "digivolved" && event.cardId === "BT4-039");
    const rikaIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-07",
    );
    expect(digivolveIndex).toBeGreaterThanOrEqual(0);
    expect(rikaIndex).toBeGreaterThan(digivolveIndex);
    expect(s.perm("attacker").topCard.cardId).toBe("BT4-039");
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.perm("rika").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(true);
  });

  it.each([true, false])(
    "trashes an Option it used from under itself unless that Option placed itself (linked=%s) (Q5430)",
    async (acceptLink) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST22-07", as: "rika", under: [{ card: "ST22-09", as: "plugIn" }] },
              { card: "ST22-03", as: "kyubimon" },
            ],
            security: ["BT1-090"],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["ST1-02", "ST1-02"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: acceptLink ? [] : ["Link"] },
      );
      await s.ready();
      const plugInId = s.inst("plugIn").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("kyubimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);

      expect(s.perm("rika").isSuspended).toBe(true);
      expect(s.perm("rika").stack).toHaveLength(0);
      expect(s.perm("kyubimon").linked.some((card) => card.instanceId === plugInId)).toBe(acceptLink);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === plugInId)).toBe(!acceptLink);
    },
  );
});
