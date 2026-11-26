import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-06";

const cardId = "BD06-06";
const highElfmon = "BD06-05";
const redAlysion = "BD01-02";
const vegetation3000 = "BT10-043";
const vegetation4000 = "BT1-065";
const miniDragon3000 = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;
type DigivolveParams = { hand: readonly string[]; autoDeclineOptional?: boolean };

async function digivolveSuspendedHighElfmon({ hand, autoDeclineOptional }: DigivolveParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: highElfmon, as: "stack", suspended: true, under: ["BD06-04"] }],
        hand: [{ card: cardId, as: "silvamon" }, ...hand.map((card, index) => ({ card, as: `hand${index}` }))],
        deck: [miniDragon3000],
      },
    },
    autoDeclineOptional === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("stack").permanentId,
      instanceId: s.inst("silvamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("stack").topCard.cardId === cardId);
  return s;
}

async function chooseHandCard(s: Harness, instanceId: string) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds: [instanceId] },
    }),
  ).toEqual({ ok: true });
}

function permanentOf(s: Harness, instanceId: string) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId);
}

describe("BD06-06 Silvamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "Silvamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      types: ["Vegetation", "ALYSION"],
      effectText:
        "[When Digivolving] By playing 1 3000 DP or lower Digimon card with the [Vegetation] or [ALYSION] trait from your hand suspended without paying the cost, this Digimon may unsuspend.\n[All Turns] All of your other suspended Digimon get +2000 DP.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles the suspended free play as the unsuspend cost and the other-suspended aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
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
            from: ["hand"],
            payCost: false,
            suspended: true,
            optional: true,
            abortOnDecline: true,
          },
          { kind: "Unsuspend", target: { isSelf: true }, condition: { kind: "ifThisEffectActed" } },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Aura",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], suspended: true, excludeSelf: true },
              count: "all",
            },
            effect: { kind: "modifyDP", amount: 2000 },
          },
        ],
      },
    ]);
  });

  it("plays a 3000 DP Vegetation Digimon suspended for free, then unsuspends", async () => {
    const s = await digivolveSuspendedHighElfmon({ hand: [vegetation3000, vegetation4000, miniDragon3000] });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("hand0").instanceId],
      min: 0,
      max: 1,
    });
    await chooseHandCard(s, s.inst("hand0").instanceId);
    await settle(() => permanentOf(s, s.inst("hand0").instanceId) !== undefined);
    await drainMicrotasks(20);

    const played = permanentOf(s, s.inst("hand0").instanceId)!;
    expect(played.isSuspended).toBe(true);
    expect(s.perm("stack").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hand1").instanceId, s.inst("hand2").instanceId]),
    );
    expect(played.currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it("accepts an ALYSION Digimon of another color", async () => {
    const s = await digivolveSuspendedHighElfmon({ hand: [redAlysion] });
    await chooseHandCard(s, s.inst("hand0").instanceId);
    await settle(() => permanentOf(s, s.inst("hand0").instanceId) !== undefined);
    await drainMicrotasks(20);

    expect(permanentOf(s, s.inst("hand0").instanceId)!.isSuspended).toBe(true);
    expect(s.perm("stack").isSuspended).toBe(false);
  });

  it("stays suspended when no hand card qualifies", async () => {
    const s = await digivolveSuspendedHighElfmon({ hand: [vegetation4000, miniDragon3000] });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(30);

    expect(s.perm("stack").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hand0").instanceId, s.inst("hand1").instanceId]),
    );
  });

  it("stays suspended and keeps the hand card when the play is declined", async () => {
    const s = await digivolveSuspendedHighElfmon({ hand: [vegetation3000], autoDeclineOptional: true });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(30);

    expect(s.perm("stack").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hand0").instanceId);
  });

  it("gives +2000 DP to your other suspended Digimon on either player's turn, not to itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "silvamon", suspended: true },
          { card: miniDragon3000, as: "suspendedOwn", suspended: true },
          { card: miniDragon3000, as: "activeOwn" },
        ],
      },
      1: { battleArea: [{ card: miniDragon3000, as: "opponentSuspended", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("silvamon").currentDP).toBe(11000);
    expect(s.perm("suspendedOwn").currentDP).toBe(5000);
    expect(s.perm("activeOwn").currentDP).toBe(3000);
    expect(s.perm("opponentSuspended").currentDP).toBe(3000);

    await advance(s.engine).verb.suspend([s.perm("activeOwn").permanentId]);
    expect(s.perm("activeOwn").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
