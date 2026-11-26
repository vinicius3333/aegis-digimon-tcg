import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-10";
const vanilla = "BT1-009";
const purpleVanilla = "BT2-067";
const shaman = "BT1-080";
const levelFive = "BT9-063";
const levelSix = "ST1-10";
const levelSeven = "TEST-BD04-10-LEVEL-SEVEN";

function registerLevelSeven() {
  syntheticDefinitions.set(levelSeven, {
    ...getCardDefinition(levelSix)!,
    cardId: levelSeven,
    imageId: levelSeven,
    nameEn: "Level Seven Testmon",
    level: 7,
  });
}

function battleAreaCardIds(s: EngineSetup, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);
}

async function useDarkRetribution() {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: purpleVanilla, as: "nonShaman", suspended: true },
          { card: shaman, as: "shaman", suspended: true },
        ],
        hand: [{ card: cardId, as: "retribution" }],
        deck: [vanilla, vanilla, vanilla],
      },
      1: {
        battleArea: [
          { card: levelSix, as: "levelSix" },
          { card: levelFive, as: "levelFive" },
        ],
        deck: [vanilla, vanilla, vanilla],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm("levelSix").topCard!.instanceId);
  s.state.memory = 6;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("retribution").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
  await drainMicrotasks(40);
  return s;
}

async function opponentBoardAfterSecurityPreferring(preferred: string) {
  registerLevelSeven();
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: { security: [{ card: cardId, as: "retribution" }] },
      1: {
        battleArea: [
          { card: vanilla, as: "attacker" },
          { card: levelSix, as: "levelSix" },
          { card: levelSeven, as: "levelSeven" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm(preferred).topCard!.instanceId);
  s.state.turnSeat = 1;
  await s.ready();

  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
  await drainMicrotasks(40);
  await advance(s.engine).finishAttack();
  return battleAreaCardIds(s, 1);
}

describe("BD04-10 Dark Retribution", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Dark Retribution",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 6,
      effectText:
        "[Main] Delete 1 of your opponent's level 5 or lower Digimon. Then, 1 of your [Shaman] trait Digimon unsuspends and gains ＜Blocker＞ until your opponent's turn ends. (This Digimon can block in the blocker timing.)",
      securityEffectText: "[Security] Delete 1 of your opponent's level 6 or lower Digimon.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes only a level 5 or lower opposing Digimon", async () => {
    const s = await useDarkRetribution();

    expect(battleAreaCardIds(s, 1)).toEqual([levelSix]);
  });

  it("unsuspends a [Shaman] trait Digimon and grants it Blocker", async () => {
    const s = await useDarkRetribution();

    expect(s.perm("shaman").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(true);
    expect(s.perm("nonShaman").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonShaman"), "Blocker")).toBe(false);
  });

  it("keeps Blocker through the opponent's turn and loses it afterwards", async () => {
    const s = await useDarkRetribution();
    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(true);

    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(false);
  });

  it("deletes a level 6 Digimon as a security effect", async () => {
    expect(await opponentBoardAfterSecurityPreferring("levelSix")).toEqual([vanilla, levelSeven]);
  });

  it("never deletes a level 7 Digimon as a security effect", async () => {
    const survivors = await opponentBoardAfterSecurityPreferring("levelSeven");

    expect(survivors).toContain(levelSeven);
    expect(survivors).toHaveLength(2);
  });
});
