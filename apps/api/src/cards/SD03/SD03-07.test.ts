import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-07";

const cardId = "SD03-07";
const greenAlysion = "BD06-05";
const greenVegetation4000 = "BT1-065";
const vegetation3000 = "BT10-043";
const redAlysion2000 = "BD01-02";
const vanilla3000 = "BT1-009";
const vanilla6000 = "BT1-019";
const vanilla7000 = "BT11-051";
const securityDigimon = "BT1-010";

type Harness = ReturnType<typeof setupEngine>;
type MainParams = { autoDeclineOptional?: boolean; preSuspended?: number; returnAliases?: readonly string[] };

function setupMain({ autoDeclineOptional, preSuspended, returnAliases }: MainParams) {
  const preferInstanceIds: string[] = [];
  const suspendedOwn = Array.from({ length: preSuspended ?? 1 }, (_, index) => ({
    card: vanilla3000,
    as: `suspendedOwn${index}`,
    suspended: true,
  }));
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: greenAlysion, as: "attacker" },
          { card: greenVegetation4000, as: "nonAlysion" },
          ...suspendedOwn,
        ],
        hand: [{ card: cardId, as: "saber" }],
      },
      1: {
        battleArea: [
          { card: vanilla3000, as: "victim", suspended: true },
          { card: vanilla6000, as: "boundary6000" },
          { card: vanilla3000, as: "low3000" },
          { card: vanilla7000, as: "big7000" },
        ],
      },
    },
    autoDeclineOptional === true
      ? { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds }
      : { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  for (const alias of returnAliases ?? []) {
    preferInstanceIds.push(s.inst(alias).instanceId);
  }
  s.state.memory = 10;
  return s;
}

function opponentBoardIds(s: Harness) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId);
}

function opponentDeckBottomIds(s: Harness) {
  return s.state.players[1]!.deck.map((card) => card.instanceId);
}

function useSaber(s: Harness) {
  return s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("saber").instanceId });
}

describe("SD03-07 Emerald Saber", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Emerald Saber",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 6,
      effectText:
        "[Main] 1 of your Digimon with the [ALYSION] trait may attack your opponent's Digimon. Then, for each of your suspended Digimon, return 1 of your opponent's 6000 DP or lower Digimon to the bottom of the deck.",
      securityEffectText:
        "[Security] You may play 1 3000 DP or lower Digimon card with the [Vegetation] or [ALYSION] trait from your hand or trash suspended without paying the cost. Then, add this card to the hand.",
    });
  });

  it("compiles the ALYSION attack, the per-suspended bottom-deck return, and the Security play", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Attack",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
              count: 1,
            },
            attackTargetScope: "digimon",
            optional: true,
          },
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
              count: 0,
              countModifier: {
                amount: 1,
                scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"], suspended: true }, unit: "cards" },
              },
            },
            to: "deckBottom",
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                dp: { op: "lte", value: 3000 },
                nameOrTrait: [{ tokens: ["Vegetation", "ALYSION"], match: "trait" }],
              },
              count: 1,
            },
            from: ["hand", "trash"],
            payCost: false,
            suspended: true,
            optional: true,
          },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });

  it("declares the ALYSION attack, returns one 6000 DP or lower Digimon per suspended Digimon, then battles", async () => {
    const s = setupMain({ returnAliases: ["boundary6000", "low3000"] });
    await s.ready();
    const victimId = s.inst("victim").instanceId;
    const victimPermanentId = s.perm("victim").permanentId;
    const boundaryPermanentId = s.perm("boundary6000").permanentId;
    const lowPermanentId = s.perm("low3000").permanentId;

    expect(useSaber(s)).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.trash.some((card) => card.cardId === cardId) &&
        opponentBoardIds(s).length === 1,
    );
    await drainMicrotasks(20);

    expect(s.decisions.map(({ req }) => [req.kind, req.options?.candidateInstanceIds])).toEqual([
      ["optional", undefined],
      ["selectCards", [victimPermanentId]],
      ["chooseTargets", [victimPermanentId, boundaryPermanentId, lowPermanentId]],
      ["orderCards", expect.any(Array)],
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(victimId);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("nonAlysion").isSuspended).toBe(false);
    expect(opponentBoardIds(s)).toEqual([s.inst("big7000").instanceId]);
    expect(opponentDeckBottomIds(s)).toEqual(
      expect.arrayContaining([s.inst("boundary6000").instanceId, s.inst("low3000").instanceId]),
    );
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("returns one Digimon per already suspended Digimon when the attack is declined", async () => {
    const s = setupMain({ autoDeclineOptional: true, returnAliases: ["boundary6000"] });
    await s.ready();

    expect(useSaber(s)).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.trash.some((card) => card.cardId === cardId) && opponentBoardIds(s).length === 3,
    );
    await drainMicrotasks(20);

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(opponentDeckBottomIds(s)).toEqual([s.inst("boundary6000").instanceId]);
    expect(opponentBoardIds(s)).toEqual(
      expect.arrayContaining(["victim", "low3000", "big7000"].map((alias) => s.inst(alias).instanceId)),
    );
  });

  it("returns nothing without suspended Digimon when the attack is declined", async () => {
    const s = setupMain({ autoDeclineOptional: true, preSuspended: 0 });
    await s.ready();

    expect(useSaber(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
    await drainMicrotasks(30);

    expect(opponentBoardIds(s)).toHaveLength(4);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("plays a qualifying Digimon from the trash suspended, then adds itself to the hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: greenVegetation4000, as: "tooBig" }],
          trash: [{ card: redAlysion2000, as: "fromTrash" }],
          security: [{ card: cardId, as: "saber" }],
        },
        1: { battleArea: [{ card: vanilla3000, dp: 1000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("saber").instanceId));
    await drainMicrotasks(20);

    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("fromTrash").instanceId,
    );
    expect(played?.isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooBig").instanceId, s.inst("saber").instanceId]),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("still adds itself to the hand when the play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: vegetation3000, as: "fromHand" }],
          security: [{ card: cardId, as: "saber" }, securityDigimon],
        },
        1: { battleArea: [{ card: vanilla3000, dp: 1000, as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("saber").instanceId));
    await drainMicrotasks(20);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fromHand").instanceId);
  });
});
