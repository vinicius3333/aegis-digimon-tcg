import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ED01-01.js";

const cardId = "ED01-01";
const reptilimon = "SD01-04";
const kanataHondo = "BD01-10";
const otherTamer = "BD02-08";
const vanillaLevel3 = "BT1-009";

async function digivolveOverReptilimon(memory: number, opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: reptilimon, as: "base" }],
        hand: [{ card: cardId, as: "rubeusdramon" }],
        deck: [vanillaLevel3, vanillaLevel3],
      },
      1: { battleArea: opponentBattleArea, security: [vanillaLevel3, vanillaLevel3, vanillaLevel3] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = memory;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rubeusdramon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === cardId);
  return s;
}

function attackIntent(s: ReturnType<typeof setupEngine>, target: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm("rubeusdramon").permanentId,
    target: { kind: "permanent", permanentId: s.perm(target).permanentId },
  });
}

describe("ED01-01 Rubeusdramon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ED01",
      nameEn: "Rubeusdramon",
      nameJp: "ルビウスドラモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13_000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "R",
      effectText:
        "[When Digivolving] ＜Blitz＞ (If your opponent has 1 or more memory, this Digimon may attack.)\n[When Attacking] Delete up to 6000 DP total worth of your opponent's Digimon.\n[Your Turn] While you have [Kanata Hondo], this Digimon gains ＜Piercing＞ and can also attack your opponent's unsuspended Digimon. (When this Digimon deletes your opponent's Digimon in battle while attacking, it checks security before the attack ends.)",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles Blitz, the 6000 DP total deletion, and the Kanata Hondo grants", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    const whileYouHaveKanataHondo = {
      kind: "youHave",
      filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Kanata Hondo"], match: "nameExact" }] },
    };
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [], keywords: [{ keyword: "Blitz" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"] },
              count: "all",
              totalDpCap: 6000,
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "GainKeyword",
            target: { isSelf: true },
            keyword: { keyword: "Piercing" },
            condition: whileYouHaveKanataHondo,
          },
          { kind: "GrantCanAttackUnsuspended", target: { isSelf: true }, condition: whileYouHaveKanataHondo },
        ],
      },
    ]);
  });

  it("digivolves from Reptilimon for 5, attacks with Blitz, and deletes 6000 DP total but not a 7000 DP Digimon", async () => {
    const s = await digivolveOverReptilimon(3, [
      { card: vanillaLevel3, as: "tooStrong", dp: 7000 },
      { card: vanillaLevel3, as: "first", dp: 3000 },
      { card: vanillaLevel3, as: "second", dp: 3000 },
    ]);
    expect(s.state.memory).toBe(-2);
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").isSuspended && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("tooStrong").permanentId,
    ]);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([reptilimon]);
    assertNoLoudGap(s);
  });

  it("does not attack with Blitz while the opponent has no memory", async () => {
    const s = await digivolveOverReptilimon(5, [{ card: vanillaLevel3, as: "weak", dp: 3000 }]);
    await settle(() => s.state.memory === 0);

    expect(s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId)).toBe(false);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("deletes a single 6000 DP Digimon when attacking and cannot delete a 7000 DP one", async () => {
    for (const [dp, remaining] of [
      [6000, 0],
      [7000, 1],
    ] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: cardId, as: "rubeusdramon" }] },
          1: { battleArea: [{ card: vanillaLevel3, as: "target", dp }], security: [vanillaLevel3, vanillaLevel3] },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("rubeusdramon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

      expect(s.state.players[1]!.battleArea).toHaveLength(remaining);
    }
  });

  it("gains Piercing and can attack an unsuspended Digimon while you have Kanata Hondo", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "rubeusdramon" },
          { card: kanataHondo, as: "kanata" },
        ],
      },
      1: { battleArea: [{ card: vanillaLevel3, as: "unsuspended", dp: 20_000 }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("rubeusdramon"))).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("rubeusdramon"))).toBe(true);
    expect(attackIntent(s, "unsuspended")).toEqual({ ok: true });
  });

  it("gains neither with another Tamer and cannot attack an unsuspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "rubeusdramon" },
          { card: otherTamer, as: "valner" },
        ],
      },
      1: { battleArea: [{ card: vanillaLevel3, as: "unsuspended", dp: 20_000 }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("rubeusdramon"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("rubeusdramon"))).toBe(false);
    expect(attackIntent(s, "unsuspended")).toMatchObject({ ok: false });
  });

  it("gains neither during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "rubeusdramon" },
          { card: kanataHondo, as: "kanata" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("rubeusdramon"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("rubeusdramon"))).toBe(false);
  });
});
