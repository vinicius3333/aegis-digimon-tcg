import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { attackPlayer } from "#api/engine/testkit/attackPlayer";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD01-06";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";

type BoardParams = { opponentDp: readonly number[]; security?: number };

async function boardWithRubeusdramon({ opponentDp, security = 0 }: BoardParams) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "rubeusdramon", under: [vanillaRedLevel5] }] },
      1: {
        battleArea: opponentDp.map((dp, index) => ({ card: vanillaRedLevel3, as: `target${index}`, dp })),
        security: Array.from({ length: security }, () => vanillaRedLevel3),
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  return s;
}

function opponentBattleAreaIds(s: Awaited<ReturnType<typeof boardWithRubeusdramon>>) {
  return s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
}

describe("BD01-06 Rubeusdramon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "Rubeusdramon",
      nameJp: "ルビウスドラモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "SR",
      effectText:
        "＜Security A. +1＞ (This Digimon checks 1 additional security card.)\n[When Attacking][Once Per Turn] Delete 1 of your opponent's Digimon with 4000 DP or less.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from Reptilimon, a red level 5 Digimon, for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BD01-05", as: "base" }],
        hand: [{ card: cardId, as: "rubeusdramon" }],
        deck: [vanillaRedLevel3],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rubeusdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BD01-05"]);
    expect(s.state.memory).toBe(2);
  });

  it("checks 2 security cards with Security A. +1", async () => {
    const s = await boardWithRubeusdramon({ opponentDp: [], security: 3 });
    expect(observe(s.engine).keywordAmount(s.perm("rubeusdramon"), "SecurityAttack")).toBe(1);

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("rubeusdramon") });

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("deletes an opposing Digimon with exactly 4000 DP when attacking and leaves one with 5000 DP", async () => {
    const s = await boardWithRubeusdramon({ opponentDp: [4000, 5000] });

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("rubeusdramon") });

    expect(opponentBattleAreaIds(s)).toEqual([s.perm("target1").permanentId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("target0").instanceId]);
    assertNoLoudGap(s);
  });

  it("deletes only once per turn across two attacks", async () => {
    const s = await boardWithRubeusdramon({ opponentDp: [4000, 4000], security: 4 });

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("rubeusdramon") });
    expect(opponentBattleAreaIds(s)).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("rubeusdramon").permanentId]);
    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("rubeusdramon") });

    expect(opponentBattleAreaIds(s)).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not pass either effect down as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "host", under: [cardId] }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "target", dp: 3000 }], security: [vanillaRedLevel3] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("host") });

    expect(opponentBattleAreaIds(s)).toEqual([s.perm("target").permanentId]);
  });
});
