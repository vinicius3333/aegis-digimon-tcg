import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-087.js";
import "../BT1/BT1-107.js";
import "../BT2/BT2-020.js";
import "../BT10/BT10-086.js";
import "../BT5/BT5-069.js";
import "./BT4-097.js";
import "./BT4-104.js";

describe("BT4-097 Kari Kamiya", () => {
  it("may suspend to gain 1 memory when a card leaves own security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-097", as: "kari" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT4-076", as: "attacker" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kari").isSuspended && s.state.memory === -1);

    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT4-097", as: "securityTamer", faceUp: true }] } },
      { autoDeclineOptional: true },
    );
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});

describe("BT4-097 Kari Kamiya — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  function attackPlayer(s: ReturnType<typeof setupEngine>, attackerAlias: string) {
    return s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    });
  }

  it("keeps the attack going through <Security Attack +1> after the memory gain moves memory to her side (Q1248)", async () => {
    const memoryWithOneCheckLeft: number[] = [];
    const s: ReturnType<typeof setupEngine> = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-097", as: "kari" }],
          security: [
            { card: "BT1-009", as: "firstChecked" },
            { card: "BT1-009", as: "secondChecked" },
          ],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT5-069", as: "attacker" }], deck: [...FILLER] },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        onEvent: () => {
          if (s?.state.players[0]!.security.length === 1) memoryWithOneCheckLeft.push(s.state.memory);
        },
      },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    expect(memoryWithOneCheckLeft).toContain(-1);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toContain(s.inst("firstChecked").instanceId);
    expect(trashIds).toContain(s.inst("secondChecked").instanceId);
  });

  it("gains memory when [Holy Wave]'s recovery refills the security stack it was checked from (Q1249)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-097", as: "kari" }],
          security: [{ card: "BT1-107", as: "holyWave" }],
          deck: [{ card: "BT1-009", as: "recovered" }, ...FILLER],
        },
        1: { battleArea: [{ card: "BT4-076", as: "attacker" }], deck: [...FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.perm("kari").isSuspended && s.state.memory === -1);
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
  });

  it("gains memory when [T.K. Takaishi] moves a yellow security card to hand and recovers 1 (Q1250)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-097", as: "kari" }],
          hand: [{ card: "BT1-087", as: "takaishi" }],
          security: [{ card: "BT1-107", as: "yellowSecurity" }],
          deck: [{ card: "BT1-009", as: "recovered" }, ...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takaishi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kari").isSuspended && s.state.players[0]!.security.length === 1);
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("yellowSecurity").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("gains memory when the opponent's [Gallantmon] trashes her security directly (Q1251)", async () => {
    async function gallantmonAttacksWithTrash(trashCount: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT4-097", as: "kari" },
              { card: "BT1-009", as: "defender", suspended: true },
            ],
            security: ["BT1-009", "BT1-009"],
            trash: Array.from({ length: trashCount }, () => "BT1-009"),
            deck: [...FILLER],
          },
          1: { battleArea: [{ card: "BT2-020", as: "gallantmon" }], deck: [...FILLER] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 0;
      const defenderId = s.perm("defender").permanentId;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("gallantmon").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId));
      await settle();
      return s;
    }

    const trashed = await gallantmonAttacksWithTrash(10);
    expect(trashed.state.players[0]!.security).toHaveLength(1);
    expect(trashed.perm("kari").isSuspended).toBe(true);
    expect(trashed.state.memory).toBe(-1);

    const untouched = await gallantmonAttacksWithTrash(9);
    expect(untouched.state.players[0]!.security).toHaveLength(2);
    expect(untouched.perm("kari").isSuspended).toBe(false);
    expect(untouched.state.memory).toBe(0);
  });

  it("gains memory when her own [Blinding Ray] trashes her top security card (Q1252)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-097", as: "kari" }, "BT1-087"],
          hand: [{ card: "BT4-104", as: "blindingRay" }],
          security: [{ card: "BT1-009", as: "trashedSecurity" }, "BT1-009"],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blindingRay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kari").isSuspended && s.state.memory === 6);
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashedSecurity").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("cannot suspend for memory when she is the security card that played herself (Q1253)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-097", as: "kariInPlay" }],
          security: [{ card: "BT4-097", as: "kariFromSecurity" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT4-076", as: "attacker" }], deck: [...FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const fromSecurityId = s.inst("kariFromSecurity").instanceId;

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === fromSecurityId),
    );
    await settle();

    const playedFromSecurity = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === fromSecurityId,
    );
    expect(playedFromSecurity?.isSuspended).toBe(false);
    expect(s.perm("kariInPlay").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
  });

  it("gains memory when the opponent's [Omnimon (X Antibody)] reveals her security and trashes 1 of them (Q2010)", async () => {
    async function omnimonDigivolves({ useRevealEffect }: { useRevealEffect: boolean }) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT4-097", as: "kari" }],
            security: [
              { card: "BT1-009", as: "revealedFirst" },
              { card: "BT1-009", as: "revealedSecond" },
              { card: "BT1-009", as: "revealedThird" },
            ],
            deck: [...FILLER],
          },
          1: {
            battleArea: [{ card: "BT3-016", as: "base" }],
            hand: [{ card: "BT10-086", as: "omnimon" }],
            deck: [...FILLER],
          },
        },
        {
          autoSelectCards: true,
          autoAcceptOptional: true,
          declinePrompts: useRevealEffect ? [] : ["By placing 1 [X Antibody] or level 6 card"],
        },
      );
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("omnimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT10-086");
      await settle();
      return s;
    }

    const revealed = await omnimonDigivolves({ useRevealEffect: true });
    expect(revealed.state.players[0]!.security).toHaveLength(2);
    expect(revealed.state.players[0]!.trash).toHaveLength(1);
    expect(revealed.perm("kari").isSuspended).toBe(true);
    expect(revealed.state.memory).toBe(2);

    const declined = await omnimonDigivolves({ useRevealEffect: false });
    expect(declined.state.players[0]!.security).toHaveLength(3);
    expect(declined.perm("kari").isSuspended).toBe(false);
    expect(declined.state.memory).toBe(3);
  });
});
