import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD01/SD01-05";

const cardId = "SD01-05";
const liskmon = "SD01-03";
const reptilimon = "SD01-04";
const kanata = "SD01-06";
const vanillaRedLevel3 = "BT1-009";

type DigivolveParams = {
  ownBoard?: readonly PermanentSpec[];
  under?: readonly string[];
  opponentDp: readonly number[];
};

async function digivolveFromReptilimon({ ownBoard = [], under = [], opponentDp }: DigivolveParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: reptilimon, as: "base", under: [...under] }, ...ownBoard],
        hand: [{ card: cardId, as: "rubeusdramon" }],
        deck: [vanillaRedLevel3],
      },
      1: { battleArea: opponentDp.map((dp, index) => ({ card: vanillaRedLevel3, as: `target${index}`, dp })) },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rubeusdramon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === cardId && s.state.pendingDecision === undefined);
  return s;
}

function survivingTargets(s: Awaited<ReturnType<typeof digivolveFromReptilimon>>, count: number) {
  return Array.from({ length: count }, (_, index) => `target${index}`).filter((alias) =>
    s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId),
  );
}

describe("SD01-05 Rubeusdramon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Rubeusdramon",
      nameJp: "ルビウスドラモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "SR",
      effectText:
        "＜Piercing＞ (When this Digimon attacks and deletes your opponent's Digimon in battle, it checks security before the attack ends.)\n[When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles Piercing and the When Digivolving 6000 DP deletion", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
              count: 1,
            },
          },
        ],
      },
    ]);
  });

  it("digivolves from Reptilimon for 4 memory and deletes a 6000 DP Digimon but not a 7000 DP one", async () => {
    const s = await digivolveFromReptilimon({ opponentDp: [7000, 6000] });

    expect(survivingTargets(s, 2)).toEqual(["target0"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("target1").instanceId]);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("reaches 8000 DP with Kanata Hondo and 9000 DP with Liskmon inherited as well", async () => {
    const withKanata = await digivolveFromReptilimon({
      ownBoard: [{ card: kanata, as: "kanata" }],
      opponentDp: [9000, 8000],
    });
    expect(survivingTargets(withKanata, 2)).toEqual(["target0"]);

    const withBoth = await digivolveFromReptilimon({
      ownBoard: [{ card: kanata, as: "kanata" }],
      under: [liskmon],
      opponentDp: [10000, 9000],
    });
    expect(survivingTargets(withBoth, 2)).toEqual(["target0"]);
    assertNoLoudGap(withBoth);
  });

  it("deletes nothing when played from hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "rubeusdramon" }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "target0", dp: 1000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rubeusdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("checks security after deleting a Digimon in battle with Piercing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "attacker" }] },
        1: {
          battleArea: [{ card: vanillaRedLevel3, as: "defender", suspended: true }],
          security: [vanillaRedLevel3, vanillaRedLevel3],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
