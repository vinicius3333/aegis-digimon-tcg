import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-04";

const cardId = "SD03-04";
const elfmon = "SD03-03";
const silvamon = "SD03-05";
const redAlysion = "BD01-02";
const vegetation3000 = "BT10-043";
const vegetation4000 = "BT1-065";
const miniDragon3000 = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;
type DigivolveParams = { hand: readonly string[]; suspended?: boolean; autoDeclineOptional?: boolean };

async function digivolveElfmon({ hand, suspended, autoDeclineOptional }: DigivolveParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: elfmon, as: "stack", suspended: suspended === true }],
        hand: [{ card: cardId, as: "highElfmon" }, ...hand.map((card, index) => ({ card, as: `hand${index}` }))],
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
      instanceId: s.inst("highElfmon").instanceId,
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

describe("SD03-04 HighElfmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "HighElfmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Fairy", "ALYSION"],
      effectText:
        "[When Digivolving] By suspending this Digimon, you may play 1 3000 DP or lower Digimon card with the [Vegetation] or [ALYSION] trait from your hand suspended without paying the cost.",
      inheritedEffectText:
        "[Your Turn] This Digimon with the [ALYSION] trait gains ＜Piercing＞. (When this Digimon attacks and deletes your opponent's Digimon in battle, it checks security before the attack ends.)",
    });
  });

  it("compiles the self-suspension cost for the suspended free play and the inherited ALYSION Piercing", () => {
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
            cost: { kind: "suspend", target: { isSelf: true } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }],
      },
    ]);
  });

  it("suspends itself to play a 3000 DP Vegetation or ALYSION Digimon suspended for free", async () => {
    const s = await digivolveElfmon({ hand: [vegetation3000, redAlysion, vegetation4000, miniDragon3000] });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("hand0").instanceId, s.inst("hand1").instanceId],
    });
    expect(s.perm("stack").isSuspended).toBe(true);
    await chooseHandCard(s, s.inst("hand1").instanceId);
    await settle(() => permanentOf(s, s.inst("hand1").instanceId) !== undefined);
    await drainMicrotasks(20);

    expect(permanentOf(s, s.inst("hand1").instanceId)!.isSuspended).toBe(true);
    expect(s.perm("stack").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(["hand0", "hand2", "hand3"].map((alias) => s.inst(alias).instanceId)),
    );
    assertNoLoudGap(s);
  });

  it("stays unsuspended and keeps the hand card when declined", async () => {
    const s = await digivolveElfmon({ hand: [vegetation3000], autoDeclineOptional: true });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(30);

    expect(s.perm("stack").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hand0").instanceId);
  });

  it("plays nothing when it is already suspended and cannot pay the cost", async () => {
    const s = await digivolveElfmon({ hand: [vegetation3000], suspended: true });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(30);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hand0").instanceId);
  });

  it("grants inherited Piercing only to an ALYSION host during your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: silvamon, as: "alysionHost", under: [cardId] },
          { card: vegetation4000, as: "vegetationHost", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("alysionHost"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("vegetationHost"))).toBe(false);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: silvamon, as: "alysionHost", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).hasPierce(opponentTurn.perm("alysionHost"))).toBe(false);
  });
});
