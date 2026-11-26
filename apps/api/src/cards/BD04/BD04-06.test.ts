import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD04-06";
const grapLeomon = "BD04-05";
const vanilla = "BT1-009";
const vanillaGorillamon = "BT1-037";
const vanillaMega = "ST1-10";

async function digivolveIntoBanchoLeomonChoosing(suspendTarget: "small" | "large") {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: grapLeomon, as: "host" }],
        hand: [{ card: cardId, as: "bancho" }],
      },
      1: {
        battleArea: [
          { card: vanilla, as: "small" },
          { card: vanillaGorillamon, as: "large" },
        ],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm(suspendTarget).topCard!.instanceId);
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("bancho").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("host").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

function opponentBattleArea(s: EngineSetup) {
  return s.state.players[1]!.battleArea.map((permanent) => ({
    cardId: permanent.topCard?.cardId,
    suspended: permanent.isSuspended,
  }));
}

async function opponentTurnBoard(banchoSuspended: boolean) {
  const s = setupEngine({
    0: { battleArea: [{ card: cardId, as: "bancho", suspended: banchoSuspended }], security: [vanilla] },
    1: {
      battleArea: [
        { card: vanillaMega, as: "highest" },
        { card: vanillaMega, as: "tiedHighest" },
        { card: vanilla, as: "lower" },
      ],
    },
  });
  s.state.turnSeat = 1;
  await s.ready();
  return s;
}

function attackPlayer(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(1, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

describe("BD04-06 BanchoLeomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "BanchoLeomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      types: ["Beastkin", "Boss"],
      effectText:
        "[When Digivolving][On Deletion] Suspend 1 of your opponent's Digimon. Then, return 1 of your opponent's suspended Digimon with 5000 DP or less to the bottom of the deck.\n[Opponent's Turn] While this Digimon is suspended, all of your opponent's Digimon with the highest DP can only attack suspended Digimon.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends a Digimon and returns a suspended 5000-DP-or-lower Digimon to the bottom of the deck when digivolving", async () => {
    const s = await digivolveIntoBanchoLeomonChoosing("small");

    expect(opponentBattleArea(s)).toEqual([{ cardId: vanillaGorillamon, suspended: false }]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe(vanilla);
  });

  it("returns nothing when no suspended opposing Digimon has 5000 DP or less", async () => {
    const s = await digivolveIntoBanchoLeomonChoosing("large");

    expect(opponentBattleArea(s)).toEqual([
      { cardId: vanilla, suspended: false },
      { cardId: vanillaGorillamon, suspended: true },
    ]);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("suspends and returns again on deletion", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "bancho" }] },
        1: {
          battleArea: [
            { card: vanillaGorillamon, as: "large" },
            { card: vanilla, as: "small" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("small").topCard!.instanceId);
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("bancho").permanentId], "byEffect")).toBe(1);
    await drainMicrotasks(40);

    expect(opponentBattleArea(s)).toEqual([{ cardId: vanillaGorillamon, suspended: false }]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual([vanilla]);
  });

  it("limits every opposing Digimon with the highest DP to attacking suspended Digimon while suspended", async () => {
    const s = await opponentTurnBoard(true);

    expect(observe(s.engine).isRestricted(s.perm("highest"), "attackOnlySuspendedDigimon")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tiedHighest"), "attackOnlySuspendedDigimon")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lower"), "attackOnlySuspendedDigimon")).toBe(false);
    expect(attackPlayer(s, "highest")).toEqual({ ok: false, reason: "illegal-target" });
    expect(attackPlayer(s, "lower")).toEqual({ ok: true });
  });

  it("does not limit attacks while BanchoLeomon is unsuspended", async () => {
    const s = await opponentTurnBoard(false);

    expect(observe(s.engine).isRestricted(s.perm("highest"), "attackOnlySuspendedDigimon")).toBe(false);
    expect(attackPlayer(s, "highest")).toEqual({ ok: true });
  });

  it("does not limit the opponent's Digimon during your turn", async () => {
    const s = await opponentTurnBoard(true);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("highest"), "attackOnlySuspendedDigimon")).toBe(false);
  });
});
