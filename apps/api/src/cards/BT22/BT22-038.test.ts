import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-038.js";
import "../index.js";

describe("BT22-038 Monzaemon", () => {
  it("scales Ver.1-to-Monzaemon digivolution cost and shares the once-per-turn removal/lock reaction", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(replacement?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
      into: { cardId: "BT22-038" },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
    const triggered = compiled.effects.filter(
      (entry) => entry.trigger === "WhenDigivolving" || entry.trigger === "WhenAttacking",
    );
    expect(triggered[0]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "SelectBind",
          cost: { kind: "trash" },
        },
        { kind: "ModifyDP", amount: -4000 },
        { kind: "DisableTimingEffect", timings: ["whenDigivolving"] },
      ],
    });
    expect(triggered[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "SelectBind",
          cost: { kind: "trash" },
        },
        { kind: "ModifyDP", amount: -4000 },
        { kind: "DisableTimingEffect", timings: ["whenDigivolving"] },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited && entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("implements Q4884-Q4889 by reducing for face-down sources, paying one, and locking one target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-050",
              as: "numemon",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT22-038", as: "monzaemon" }],
        },
        1: { battleArea: [{ card: "BT22-052", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("numemon").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving"));
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(8000);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(
      s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-001" || card.cardId === "BT1-002"),
    ).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("numemon"));
    await settle();
    expect(
      s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-001" || card.cardId === "BT1-002"),
    ).toHaveLength(1);
  });

  it("applies the inherited attack reduction only once from a realistic stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-040", under: ["BT22-038"], as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-028", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("target").currentDP === 6000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle();

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("does not reduce a digivolution into a different card whose name contains Monzaemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX9-050",
            as: "numemon",
            under: [
              { card: "BT1-001", faceUp: false },
              { card: "BT1-002", faceUp: false },
            ],
          },
        ],
        hand: [{ card: "BT15-040", as: "nearName" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("numemon").permanentId,
        instanceId: s.inst("nearName").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("numemon").topCard?.cardId === "BT15-040");

    expect(s.state.memory).toBe(2);
  });
});

describe("BT22-038 Monzaemon — KB Q&A rulings", () => {
  /**
   * Attack with Monzaemon so its [When Attacking] ＜Armor Purge＞ locks one opposing Digimon:
   * `subject` when `lockSubject` is true, otherwise the `decoy`, which leaves `subject` as the
   * unlocked control. Hands the turn to the opponent afterwards; the lock lasts until their turn ends.
   */
  async function attackLocking(board: BoardSpec, lockSubject: boolean) {
    const preferred: string[] = [];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    const locked = s.perm(lockSubject ? "subject" : "decoy");
    preferred.push(locked.permanentId, locked.topCard.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monzaemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).timingEffectDisabled(locked, "whenDigivolving"));
    await advance(s.engine).finishAttack();
    expect(observe(s.engine).timingEffectDisabled(s.perm("subject"), "whenDigivolving")).toBe(lockSubject);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const preferSubject = () => preferred.splice(0, preferred.length, s.perm("subject").permanentId);
    return Object.assign(s, { preferSubject });
  }

  const monzaemon = { card: "BT22-038", as: "monzaemon", under: [{ card: "BT1-001", faceUp: false }] };
  const opponentSecurity = ["ST1-02", "ST1-02", "ST1-02"];

  it.each([true, false])(
    "stops a locked Digimon's [When Digivolving] effect from activating on digivolution (locked=%s) (Q4885)",
    async (lockSubject) => {
      const s = await attackLocking(
        {
          0: { battleArea: [monzaemon] },
          1: {
            battleArea: [
              { card: "BT20-030", as: "subject", dp: 8000 },
              { card: "BT1-009", as: "decoy", dp: 8000 },
            ],
            hand: [{ card: "BT20-031", as: "liamon" }],
            security: opponentSecurity,
          },
        },
        lockSubject,
      );

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("subject").permanentId,
          instanceId: s.inst("liamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").topCard.cardId === "BT20-031" && s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(s.perm("monzaemon").currentDP).toBe(lockSubject ? 8000 : 5000);
    },
  );

  it("still lets a locked Digimon activate its [When Digivolving] [When Attacking] effect when it attacks (Q4886)", async () => {
    const s = await attackLocking(
      {
        0: { battleArea: [monzaemon, { card: "BT1-009", as: "victim" }], security: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "EX12-037", as: "subject" },
            { card: "BT1-009", as: "decoy", dp: 8000 },
          ],
          security: opponentSecurity,
        },
      },
      true,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("subject").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await advance(s.engine).finishAttack();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it.each([true, false])(
    "stops another effect from activating a locked Digimon's [When Digivolving] effect (locked=%s) (Q4887)",
    async (lockSubject) => {
      const s = await attackLocking(
        {
          0: { battleArea: [monzaemon] },
          1: {
            battleArea: [
              { card: "BT10-112", as: "subject", suspended: true },
              { card: "BT1-009", as: "decoy", dp: 8000 },
            ],
            hand: [
              { card: "BT10-110", as: "seikenMeppa" },
              { card: "BT10-068", as: "royalKnight" },
            ],
            security: opponentSecurity,
          },
        },
        lockSubject,
      );

      s.preferSubject();
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("seikenMeppa").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT10-110"));
      await drainMicrotasks();

      const royalKnightId = s.inst("royalKnight").instanceId;
      expect(s.perm("subject").stack.some((card) => card.instanceId === royalKnightId)).toBe(!lockSubject);
      expect(s.perm("subject").isSuspended).toBe(false);
    },
  );

  it.each([true, false])(
    'does not let a locked Digimon pay the "by" cost of its [When Digivolving] effect (locked=%s) (Q4888)',
    async (lockSubject) => {
      const s = await attackLocking(
        {
          0: { battleArea: [monzaemon, { card: "BT1-009", as: "lowest" }] },
          1: {
            battleArea: [
              { card: "BT1-080", as: "subject" },
              { card: "BT10-055", as: "decoy" },
            ],
            hand: [
              { card: "BT24-081", as: "titamon" },
              { card: "BT1-013", as: "discard" },
            ],
            deck: ["BT1-010", "BT1-011"],
            security: opponentSecurity,
          },
        },
        lockSubject,
      );

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("subject").permanentId,
          instanceId: s.inst("titamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").topCard.cardId === "BT24-081");
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(
        lockSubject,
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(
        lockSubject,
      );
    },
  );

  it.each([
    { suspended: true, memoryAfter: 3 },
    { suspended: false, memoryAfter: 2 },
  ])(
    "stacks P-202's suspended-Digimon reduction with its face-down-card reduction (suspended=$suspended) (Q5196)",
    async ({ suspended, memoryAfter }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "P-202", as: "tyrannomon", suspended, under: [{ card: "BT1-001", faceUp: false }] }],
            hand: [{ card: "BT22-038", as: "monzaemon" }],
            deck: ["BT1-009"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tyrannomon").permanentId,
          instanceId: s.inst("monzaemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tyrannomon").topCard.cardId === "BT22-038");
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.memory).toBe(memoryAfter);
    },
  );
});
