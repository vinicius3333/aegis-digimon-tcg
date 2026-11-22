import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine, settle } from "#api/engine/testkit/harness";
import { compiled } from "./BT27-054.js";
import "#api/cards/index";

type Session = ReturnType<typeof setupEngine>;

const cardId = "BT27-054";
const blueTsLevel5 = "BT24-029";
const greenLevel5 = "BT5-054";
const redLevel5 = "BT1-020";
const vanillaLevel3 = "BT1-009";

function hasRestriction(s: Session, permanentId: string, restriction: string) {
  const continuous = (s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } })
    .continuous;
  return continuous.hasRestriction(permanentId, restriction);
}

function battleAreaIds(s: Session, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map(({ permanentId }) => permanentId);
}

describe("BT27-054 Lotosmon", () => {
  it("matches the printed card and compiles every clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Lotosmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Fairy", "Iliad", "TS"],
      rarity: "C",
    });
    expect(digivolutionRequirementsFor(cardId)).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects.map((effect) => [effect.trigger, effect.frequency])).toEqual([
      ["Static", undefined],
      ["OnPlay", undefined],
      ["WhenDigivolving", undefined],
      ["AllTurns", "OncePerTurn"],
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves from a level 5 [TS] Digimon or a green level 5, and rejects other level 5 Digimon", async () => {
    for (const [source, useAlternateCost] of [
      [blueTsLevel5, true],
      [greenLevel5, false],
    ] as const) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: cardId, as: "lotosmon" }] } },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("lotosmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("source").topCard.cardId === cardId && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(2);
    }

    const red = setupEngine({
      0: { battleArea: [{ card: redLevel5, as: "source" }], hand: [{ card: cardId, as: "lotosmon" }] },
    });
    red.state.memory = 5;
    await red.ready();
    expect(
      red.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: red.perm("source").permanentId,
        instanceId: red.inst("lotosmon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
  });

  it.each([
    ["2 suspended Digimon across both players reduce the play cost by 4", [true, false], [true], 7],
    ["1 suspended Digimon does not reduce the play cost", [true, false], [false], 11],
  ])("%s", async (_label, mineSuspended, theirsSuspended, paid) => {
    const s = setupEngine(
      {
        0: {
          battleArea: mineSuspended.map((suspended) => ({ card: vanillaLevel3, suspended })),
          hand: [{ card: cardId, as: "lotosmon" }],
        },
        1: { battleArea: theirsSuspended.map((suspended) => ({ card: vanillaLevel3, suspended })) },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lotosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(11 - paid);
  });

  it("on play suspends 1 opposing Digimon and stops 1 of theirs from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "lotosmon" }] },
        1: { battleArea: [{ card: vanillaLevel3, as: "rival" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lotosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rival").isSuspended && s.state.pendingDecision === undefined);

    expect(s.perm("rival").isSuspended).toBe(true);
    expect(hasRestriction(s, s.perm("rival").permanentId, "unsuspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("when digivolving may decline the suspension and still locks 1 opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: blueTsLevel5, as: "source" }], hand: [{ card: cardId, as: "lotosmon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("lotosmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId && s.state.pendingDecision === undefined);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(hasRestriction(s, s.perm("tamer").permanentId, "unsuspend")).toBe(true);
  });

  it.each([
    ["an opponent's", 1],
    ["your own", 0],
  ] as const)("deletes %s other suspended Digimon so it does not leave", async (_label, seat) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "lotosmon" },
            ...(seat === 0 ? [{ card: vanillaLevel3, as: "payment", suspended: true }] : []),
          ],
        },
        1: {
          battleArea: [
            { card: vanillaLevel3, as: "active" },
            ...(seat === 1 ? [{ card: vanillaLevel3, as: "payment", suspended: true }] : []),
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lotosmonId = s.perm("lotosmon").permanentId;
    const paymentId = s.perm("payment").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([lotosmonId], "byEffect")).toBe(0);
    await settle();

    expect(battleAreaIds(s, 0)).toContain(lotosmonId);
    expect(battleAreaIds(s, seat)).not.toContain(paymentId);
    expect(battleAreaIds(s, 1)).toContain(s.perm("active").permanentId);
    assertNoLoudGap(s);
  });

  it("leaves when the only other Digimon is unsuspended, and cannot pay with itself while suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "lotosmon", suspended: true }] },
        1: { battleArea: [{ card: vanillaLevel3, as: "active" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lotosmon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(battleAreaIds(s, 1)).toEqual([s.perm("active").permanentId]);
  });

  it("may decline the prevention, and prevents leaving only once per turn", async () => {
    const declined = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "lotosmon" }] },
        1: { battleArea: [{ card: vanillaLevel3, as: "payment", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    expect(
      await advance(declined.engine).verb.deletePermanent([declined.perm("lotosmon").permanentId], "byEffect"),
    ).toBe(1);
    expect(battleAreaIds(declined, 1)).toEqual([declined.perm("payment").permanentId]);

    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "lotosmon" }] },
        1: {
          battleArea: [
            { card: vanillaLevel3, suspended: true },
            { card: vanillaLevel3, suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lotosmonId = s.perm("lotosmon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([lotosmonId], "byEffect")).toBe(0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(await advance(s.engine).verb.deletePermanent([lotosmonId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

describe("official rulings", () => {
  it("may forbid unsuspending a different opposing Digimon than the one it suspended", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "lotosmon" }] },
        1: {
          battleArea: [
            { card: vanillaLevel3, as: "locked", suspended: true },
            { card: vanillaLevel3, as: "suspended" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lotosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("suspended").isSuspended && s.state.pendingDecision === undefined);
    expect(hasRestriction(s, s.perm("locked").permanentId, "unsuspend")).toBe(true);
    expect(hasRestriction(s, s.perm("suspended").permanentId, "unsuspend")).toBe(false);
  });
});
