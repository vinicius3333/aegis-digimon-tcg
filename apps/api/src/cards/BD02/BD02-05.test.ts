import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD02-05";
const blueAlysionLevel5 = "BD02-04";
const vanillaBlueLevel5 = "BT1-038";
const vanillaBlueLevel3 = "BT1-027";
const deckCard = "BT1-009";

type Setup = ReturnType<typeof setupEngine>;

async function digivolveIntoYukinamon(opponentBattleArea: PermanentSpec[], preferredTarget?: string) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: blueAlysionLevel5, as: "base", under: [vanillaBlueLevel3] }],
        hand: [{ card: cardId, as: "yukinamon" }],
      },
      1: { battleArea: opponentBattleArea },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
  if (preferredTarget !== undefined) {
    preferInstanceIds.push(s.perm(preferredTarget).topCard!.instanceId);
  }
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("yukinamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

async function attackWithYukinamon(defender: PermanentSpec, yukinamonSources: string[]) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "yukinamon", under: yukinamonSources }] },
      1: { battleArea: [defender] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("yukinamon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

const stackIds = (s: Setup, alias: string) => s.perm(alias).stack.map((card) => card.cardId);

describe("BD02-05 Yukinamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Yukinamon",
      nameJp: "ユキナモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ice-Snow", "ALYSION"],
      rarity: "SR",
      effectText:
        "[When Digivolving] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon. Then, this Digimon gains ＜Blocker＞ until your opponent's turn ends. (This Digimon can block in the blocker timing.)\n[All Turns] Other than against Security Digimon, compare the number of digivolution cards instead of DP in this Digimon's battles.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes the bottom 3 digivolution cards of the chosen opposing Digimon when digivolving", async () => {
    const s = await digivolveIntoYukinamon(
      [
        { card: vanillaBlueLevel5, as: "target", under: ["BT1-027", "BT1-028", "BT1-003", "BT1-009"] },
        { card: vanillaBlueLevel5, as: "bystander", under: ["BT1-027", "BT1-028"] },
      ],
      "target",
    );

    expect(stackIds(s, "target")).toEqual(["BT1-009"]);
    expect(stackIds(s, "bystander")).toEqual(["BT1-027", "BT1-028"]);
    expect(
      s.state.players[1]!.trash.map((card) => card.cardId).sort((left, right) => left.localeCompare(right)),
    ).toEqual(["BT1-003", "BT1-027", "BT1-028"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("still gains Blocker when the opponent has no digivolution cards to trash", async () => {
    const s = await digivolveIntoYukinamon([{ card: vanillaBlueLevel5, as: "target" }]);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("keeps Blocker past the end of your turn and loses it when the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: blueAlysionLevel5, as: "base", under: [vanillaBlueLevel3] }],
          hand: [{ card: cardId, as: "yukinamon" }],
          deck: [deckCard, deckCard, deckCard],
        },
        1: { battleArea: [{ card: vanillaBlueLevel5, as: "target" }], deck: [deckCard, deckCard, deckCard] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await drainMicrotasks(20);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("yukinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blocker"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await ownTurn;
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
  });

  it("wins a battle against a higher-DP Digimon with fewer digivolution cards", async () => {
    const s = await attackWithYukinamon({ card: vanillaBlueLevel5, as: "defender", dp: 20_000, suspended: true }, [
      vanillaBlueLevel3,
    ]);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("loses a battle against a lower-DP Digimon with more digivolution cards", async () => {
    const s = await attackWithYukinamon(
      {
        card: vanillaBlueLevel5,
        as: "defender",
        dp: 3000,
        suspended: true,
        under: [vanillaBlueLevel3, vanillaBlueLevel3, vanillaBlueLevel3],
      },
      [vanillaBlueLevel3],
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
