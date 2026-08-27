import { digivolutionRequirementsFor, EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-040";

describe("BT26-040 Drimogemon", () => {
  it("exposes the printed level-3 DM evolution", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    });
  });
  it("uses the exact off-color Lv.3 DM alternate evolution for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-014", as: "blueDm" }],
        hand: [{ card: CARD_ID, as: "drimogemon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueDm").permanentId,
        instanceId: s.inst("drimogemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueDm").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("uses the printed green Lv.3 evolution for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-066", as: "greenLv3" }],
        hand: [{ card: CARD_ID, as: "drimogemon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenLv3").permanentId,
        instanceId: s.inst("drimogemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenLv3").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("rejects the alternate evolution from a non-DM Lv.3", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonDm" }],
        hand: [{ card: CARD_ID, as: "drimogemon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonDm").permanentId,
        instanceId: s.inst("drimogemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("On Play suspends only an unsuspended opponent Digimon, places any hand card face down at bottom, and gains DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "drimogemon" },
            { card: "BT1-085", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-022", as: "opponent" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drimogemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.currentDP === 6000 &&
          permanent.stack.some((card) => card.instanceId === s.inst("material").instanceId),
      ),
    );
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(drimogemon.stack[0]).toMatchObject({ instanceId: s.inst("material").instanceId, faceUp: false });
    expect(drimogemon.currentDP).toBe(6000);
  });

  it("counts every face-down source in the stack, including a non-Digimon hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-085", as: "material" }],
          battleArea: [{ card: CARD_ID, as: "drimogemon", under: [{ card: "BT1-001", faceUp: false }] }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("drimogemon"));
    await settle(() => s.perm("opponent").isSuspended);
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(drimogemon.stack).toHaveLength(2);
    expect(drimogemon.stack.every(({ faceUp }) => faceUp === false)).toBe(true);
    expect(drimogemon.currentDP).toBe(7000);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "opponentTurnEnd", 1);
    expect(drimogemon.currentDP).toBe(5000);
  });

  it("When Moving resolves for itself and not for an unrelated move", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          hand: [{ card: "AD1-001", as: "material" }],
          battleArea: [{ card: "BT1-009", as: "unrelated" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    await advance(s.engine).fireGlobal(EffectTiming.OnMove, { movedPermanentId: s.perm("unrelated").permanentId });
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.perm("mover").stack).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mover").stack.length === 1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("mover").stack[0]!.faceUp).toBe(false);

    expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });

  it("activates Training by suspending and placing the deck top face down underneath", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "trainer" }], deck: [{ card: "BT1-001", as: "trainingCard" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("trainer"));
    expect(s.perm("trainer").isSuspended).toBe(true);
    expect(s.perm("trainer").stack.at(-1)?.instanceId).toBe(s.inst("trainingCard").instanceId);
    expect(s.perm("trainer").stack.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not gain DP when no hand card is available to place", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "drimogemon" }] },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drimogemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(drimogemon.stack).toHaveLength(0);
    expect(drimogemon.currentDP).toBe(5000);
  });

  it("may decline the hand placement while still resolving the mandatory suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "drimogemon" }],
          hand: [{ card: "BT1-085", as: "material" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("drimogemon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.perm("drimogemon").stack).toHaveLength(0);
    expect(s.perm("drimogemon").currentDP).toBe(5000);
  });

  it("inherits Piercing onto a realistic evolution host while standalone behavior remains top-level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-043", as: "host", under: [{ card: CARD_ID, as: "drimogemonSource" }] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect([...s.perm("standalone").keywords]).toEqual(expect.arrayContaining(["Training", "Piercing"]));
  });
});
