import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-09";
const vanilla = "BT1-009";
const vanillaLeomon = "BT1-042";
const vanillaChampion = "BT1-014";
const greenVanilla = "BT1-071";
const redBoss = "TEST-BD04-09-RED-BOSS";

function registerRedBoss() {
  syntheticDefinitions.set(redBoss, {
    ...getCardDefinition(vanillaChampion)!,
    cardId: redBoss,
    imageId: redBoss,
    nameEn: "Boss Testmon",
    types: ["Boss"],
  });
}

function useBanchosPride(s: EngineSetup) {
  return s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pride").instanceId });
}

async function grantAndDelete(recipient: string) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: greenVanilla, as: "greenEnabler" },
          { card: recipient, as: "recipient" },
        ],
        hand: [{ card: cardId, as: "pride" }],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm("recipient").topCard!.instanceId);
  s.state.memory = 5;
  await s.ready();
  const recipientId = s.perm("recipient").permanentId;
  const recipientInstanceId = s.perm("recipient").topCard!.instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pride").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
  await drainMicrotasks(40);
  const memoryBeforeDeletion = s.state.memory;
  expect(await advance(s.engine).verb.deletePermanent([recipientId], "byEffect")).toBe(1);
  await drainMicrotasks(40);
  const replayed = s.state.players[0]!.battleArea.find(
    (permanent) => permanent.topCard?.instanceId === recipientInstanceId,
  );
  return { s, replayed, memoryBeforeDeletion };
}

describe("BD04-09 Bancho's Pride", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Bancho's Pride",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 2,
      effectText:
        "While you have a Digimon with the [Boss] trait, you can ignore this card's color requirements.\n[Main] 1 of your Digimon gains \"[On Deletion] If this Digimon had [Leomon] in its name or the [Boss] trait, play this card suspended without paying the cost.\" until your opponent's turn ends.",
      securityEffectText: "[Security] Suspend 1 of your opponent's Digimon. Then, add this card to the hand.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("can be used without green while you have a [Boss] trait Digimon", async () => {
    registerRedBoss();
    const s = setupEngine(
      { 0: { battleArea: [{ card: redBoss, as: "boss" }], hand: [{ card: cardId, as: "pride" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(useBanchosPride(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
    await drainMicrotasks(40);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
  });

  it("keeps its color requirement without a [Boss] trait Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: vanilla, as: "red" }], hand: [{ card: cardId, as: "pride" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(useBanchosPride(s).ok).toBe(false);
  });

  it("lets a Digimon with [Leomon] in its name return to play suspended without paying the cost", async () => {
    const { s, replayed, memoryBeforeDeletion } = await grantAndDelete(vanillaLeomon);

    expect(replayed?.isSuspended).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeDeletion);
  });

  it("does not return a Digimon with neither [Leomon] in its name nor the [Boss] trait", async () => {
    const { s, replayed } = await grantAndDelete(vanillaChampion);

    expect(replayed).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(vanillaChampion);
  });

  it("suspends an opposing Digimon and adds itself to the hand as a security effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "pride" }] },
        1: {
          battleArea: [
            { card: vanilla, as: "attacker" },
            { card: vanilla, as: "bystander" },
          ],
        },
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === cardId));
    await drainMicrotasks(40);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("bystander").isSuspended).toBe(true);
  });
});
