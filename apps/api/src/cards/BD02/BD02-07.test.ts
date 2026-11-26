import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD02-07";
const vanillaPurpleLevel4 = "BT3-083";
const vanillaBlueLevel3 = "BT1-027";
const vanillaBlueLevel4 = "BT1-037";
const vanillaBlueLevel5 = "BT1-038";
const strongDefender = "BT1-042";

async function digivolveIntoMyotismon(opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: vanillaPurpleLevel4, as: "base" }],
        hand: [{ card: cardId, as: "myotismon" }],
      },
      1: { battleArea: opponentBattleArea },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("myotismon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

async function attackStrongerDefender(attacker: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker] },
      1: { battleArea: [{ card: strongDefender, as: "defender", suspended: true }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

const opponentBoard = (s: ReturnType<typeof setupEngine>) =>
  s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId);

describe("BD02-07 Myotismon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Myotismon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
      rarity: "C",
      effectText: "[When Digivolving] Delete 1 of your opponent's level 3 Digimon.",
      inheritedEffectText:
        "＜Retaliation＞ (When only this Digimon is deleted in battle, delete the Digimon it battled.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes an opposing level 3 Digimon and spares a level 4 Digimon", async () => {
    const s = await digivolveIntoMyotismon([
      { card: vanillaBlueLevel3, as: "levelThree" },
      { card: vanillaBlueLevel4, as: "levelFour" },
    ]);

    expect(opponentBoard(s)).toEqual([vanillaBlueLevel4]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([vanillaBlueLevel3]);
  });

  it("deletes nothing without an opposing level 3 Digimon", async () => {
    const s = await digivolveIntoMyotismon([
      { card: vanillaBlueLevel4, as: "levelFour" },
      { card: vanillaBlueLevel5, as: "levelFive" },
    ]);

    expect(opponentBoard(s)).toEqual([vanillaBlueLevel4, vanillaBlueLevel5]);
  });

  it("gives its host Retaliation, deleting the Digimon that defeated it in battle", async () => {
    const s = await attackStrongerDefender({ card: vanillaBlueLevel5, as: "attacker", under: [cardId] });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves the defender alive without Myotismon in the stack", async () => {
    const s = await attackStrongerDefender({ card: vanillaBlueLevel5, as: "attacker" });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(opponentBoard(s)).toEqual([strongDefender]);
  });

  it("does not have Retaliation itself while Myotismon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "myotismon", under: [vanillaPurpleLevel4] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("myotismon"), "Retaliation")).toBe(false);
  });
});
