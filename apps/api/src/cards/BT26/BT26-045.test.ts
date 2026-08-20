import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-045";

describe("BT26-045 GranKuwagamon", () => {
  it("uses the exact level-5 Insectoid/TS alternate requirement for cost 3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 5,
      traits: ["Insectoid", "TS"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-015", as: "titanTs" }],
        hand: [{ card: CARD_ID, as: "gran" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 3;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("titanTs").permanentId,
        instanceId: legal.inst("gran").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("titanTs").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const wrongLevel = setupEngine({
      0: {
        battleArea: [{ card: "BT26-038", as: "level4Insectoid" }],
        hand: [{ card: CARD_ID, as: "gran" }],
      },
    });
    wrongLevel.state.memory = 3;
    expect(
      wrongLevel.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongLevel.perm("level4Insectoid").permanentId,
        instanceId: wrongLevel.inst("gran").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("reduces play cost from 11 to 7 only when its hand is strictly smaller (Q7036)", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "gran" }] },
      1: { hand: ["AD1-001", "AD1-002"] },
    });
    reduced.state.memory = 7;
    await reduced.ready();
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("gran").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    expect(reduced.state.memory).toBe(0);

    const equal = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "gran" }] },
      1: { hand: ["AD1-001"] },
    });
    equal.state.memory = 7;
    await equal.ready();
    expect(equal.engine.applyIntent(0, { type: "playCard", instanceId: equal.inst("gran").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => equal.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    expect(equal.state.memory).toBe(-4);
  });

  it("freely plays exactly one eligible level-4-or-lower Insectoid/Titan and leaves invalid cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gran" }],
          hand: [
            { card: "BT26-038", as: "eligible" },
            { card: "BT1-076", as: "level5" },
            { card: "AD1-001", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gran"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-038")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("level5").instanceId, s.inst("unrelated").instanceId]),
    );
  });

  it("shares one Once Per Turn budget across On Play, When Digivolving, and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gran" }],
          hand: [
            { card: "BT26-035", as: "first" },
            { card: "BT26-038", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gran"));
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gran"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gran"));

    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.permanentId !== s.perm("gran").permanentId),
    ).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not offer or resolve the effect without an eligible hand card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "gran" }],
        hand: [{ card: "BT1-076", as: "level5Insectoid" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gran"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level5Insectoid").instanceId)).toBe(
      true,
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional" || req.kind === "selectCards")).toBe(false);
  });

  it("binds When Attacking to GranKuwagamon itself rather than another ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gran" },
            { card: "AD1-001", as: "ally" },
          ],
          hand: [{ card: "BT26-038", as: "eligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  it("grants Alliance, Piercing, and Vortex only to own matching Digimon during its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "gran" },
          { card: "BT26-038", as: "insectoid" },
          { card: "AD1-001", as: "unrelated" },
        ],
      },
      1: { battleArea: [{ card: "BT26-038", as: "opponentInsectoid" }] },
    });
    await s.ready();

    for (const alias of ["gran", "insectoid"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Alliance")).toBe(true);
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Vortex")).toBe(true);
    }
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentInsectoid"), "Alliance")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("insectoid"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("insectoid"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("insectoid"), "Vortex")).toBe(false);
  });

  it("Q7038: the Digimon freely played while attacking is immediately eligible for Alliance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gran" }],
          hand: [{ card: "BT26-038", as: "eligible" }],
        },
        1: { security: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gran").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT26-038")!;

    expect(played).toBeDefined();
    expect(observe(s.engine).hasKeyword(played, "Alliance")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => played.isSuspended);
    expect(played.isSuspended).toBe(true);
  });
});
