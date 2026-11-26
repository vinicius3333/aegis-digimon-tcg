import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-05";

const cardId = "SD03-05";
const highElfmon = "BD06-05";
const emeraldSaber = "SD03-07";
const vegetation3000 = "BT10-043";
const vegetation4000 = "BT1-065";
const vanilla = "BT1-009";
const securityDigimon = "BT1-010";
const unsuspendLock = "unsuspendDuringOwnUnsuspendPhase";

type Harness = ReturnType<typeof setupEngine>;
type DigivolveParams = { hand: readonly string[]; autoDeclineOptional?: boolean };

async function digivolveHighElfmon({ hand, autoDeclineOptional }: DigivolveParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: highElfmon, as: "stack", under: ["BD06-04"] }],
        hand: [{ card: cardId, as: "silvamon" }, ...hand.map((card, index) => ({ card, as: `hand${index}` }))],
        deck: [vanilla],
      },
      1: {
        battleArea: [
          { card: vanilla, as: "opponentA" },
          { card: vanilla, as: "opponentB" },
        ],
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

async function respond(s: Harness, kind: "selectCards" | "chooseTargets", instanceId: string) {
  await settle(() => s.state.pendingDecision?.kind === kind);
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response:
        kind === "selectCards"
          ? { kind: "selectCards", instanceIds: [instanceId] }
          : { kind: "chooseTargets", instanceIds: [instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
}

function permanentOf(s: Harness, instanceId: string) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId);
}

describe("SD03-05 Silvamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Silvamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      types: ["Vegetation", "ALYSION"],
      effectText:
        "[When Digivolving] You may play 1 3000 DP or lower Digimon card with the [Vegetation] or [ALYSION] trait from your hand suspended without paying the cost. Then, 1 of your opponent's Digimon can't unsuspend in their next unsuspend phase.\n[Your Turn][Once Per Turn] When any of your Digimon are played, you may suspend 1 Digimon.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles the optional suspended play, the mandatory unsuspend lock, and the once-per-turn played watcher", () => {
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
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: unsuspendLock,
            duration: "untilOpponentNextUnsuspendPhase",
          },
        ],
      },
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              { kind: "Suspend", target: { filter: { controllerDefault: "any", kind: ["Digimon"] } }, optional: true },
            ],
          },
        ],
      },
    ]);
    expect(compiled.effects[0]!.actions[1]).not.toHaveProperty("optional");
  });

  it("plays a 3000 DP Vegetation Digimon suspended, locks an opponent Digimon, then suspends one when it is played", async () => {
    const s = await digivolveHighElfmon({ hand: [vegetation3000, vegetation4000] });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("hand0").instanceId],
    });
    await respond(s, "selectCards", s.inst("hand0").instanceId);
    await respond(s, "chooseTargets", s.perm("opponentA").permanentId);
    await respond(s, "chooseTargets", s.perm("opponentB").permanentId);
    await settle(() => s.perm("opponentB").isSuspended);
    await drainMicrotasks(20);

    expect(permanentOf(s, s.inst("hand0").instanceId)!.isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentA"), unsuspendLock)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentB"), unsuspendLock)).toBe(false);
    expect(s.perm("opponentA").isSuspended).toBe(false);
    expect(s.perm("stack").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hand1").instanceId);
    assertNoLoudGap(s);
  });

  it("still locks an opponent Digimon when the play is declined", async () => {
    const s = await digivolveHighElfmon({ hand: [vegetation3000], autoDeclineOptional: true });
    await respond(s, "chooseTargets", s.perm("opponentB").permanentId);
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentB"), unsuspendLock));
    await drainMicrotasks(20);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hand0").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("opponentA"), unsuspendLock)).toBe(false);
  });

  it("suspends any Digimon, including your own, only for the first Digimon played each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "silvamon" }],
          hand: [
            { card: vegetation4000, as: "firstPlayed" },
            { card: vegetation4000, as: "secondPlayed" },
          ],
        },
        1: { battleArea: [{ card: vanilla, as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlayed").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson).candidateInstanceIds).toHaveLength(3);
    await respond(s, "chooseTargets", permanentOf(s, s.inst("firstPlayed").instanceId)!.permanentId);
    await settle(() => permanentOf(s, s.inst("firstPlayed").instanceId)!.isSuspended);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlayed").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => permanentOf(s, s.inst("secondPlayed").instanceId) !== undefined);
    await drainMicrotasks(30);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(permanentOf(s, s.inst("secondPlayed").instanceId)!.isSuspended).toBe(false);
    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
    expect(s.perm("silvamon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(6);
  });

  it("does not react to your Digimon played during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "silvamon" }],
          hand: [{ card: vegetation3000, as: "fromHand" }],
          security: [emeraldSaber, securityDigimon],
        },
        1: { battleArea: [{ card: vanilla, dp: 1000, as: "attacker" }] },
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
    await settle(() => permanentOf(s, s.inst("fromHand").instanceId) !== undefined);
    await drainMicrotasks(30);

    expect(permanentOf(s, s.inst("fromHand").instanceId)!.isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("silvamon").isSuspended).toBe(false);
  });
});
