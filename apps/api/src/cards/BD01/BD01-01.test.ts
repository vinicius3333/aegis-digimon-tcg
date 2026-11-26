import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD01/BD01-01";

const cardId = "BD01-01";
const liskmon = "BD01-03";
const nonAlysionGallantmon = "BT19-015";
const vanillaRedLevel3 = "BT1-009";

type DigivolveParams = { host: string; base: string; under: readonly string[]; opponentDp: readonly number[] };

async function digivolveOverTokomonStack({ host, base, under, opponentDp }: DigivolveParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: base, as: "base", under: [...under] }],
        hand: [{ card: host, as: "host" }],
        deck: [vanillaRedLevel3],
      },
      1: {
        battleArea: opponentDp.map((dp, index) => ({ card: vanillaRedLevel3, as: `target${index}`, dp })),
      },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("host").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === host);
  await drainMicrotasks(20);
  return s;
}

describe("BD01-01 Tokomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "Tokomon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      rarity: "U",
      inheritedEffectText: "[Your Turn] Add 1000 to this [ALYSION] trait Digimon's DP deletion effects' maximums.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
  });

  it("compiles the inherited clause as a Your Turn self maximum gated by the ALYSION trait", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "DeletionMaxDpModifier",
            amount: 1000,
            scope: "self",
            duration: "permanent",
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("raises Liskmon's printed 2000 maximum by exactly 1000: 3000 DP is deleted, 4000 DP is not", async () => {
    const s = await digivolveOverTokomonStack({
      host: liskmon,
      base: vanillaRedLevel3,
      under: [cardId],
      opponentDp: [3000, 4000],
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("base").permanentId)).toBe(1000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([cardId, vanillaRedLevel3]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("target1").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("target0").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("stacks with Gemmon's matching inherited maximum in a Tokomon to Gemmon to Liskmon stack", async () => {
    const s = await digivolveOverTokomonStack({
      host: liskmon,
      base: "BD01-02",
      under: [cardId],
      opponentDp: [4000, 5000],
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("base").permanentId)).toBe(2000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([cardId, "BD01-02"]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("target1").permanentId,
    ]);
    assertNoLoudGap(s);
  });

  it("leaves the maximum alone for a host without the ALYSION trait", async () => {
    const s = await digivolveOverTokomonStack({
      host: nonAlysionGallantmon,
      base: "BT19-012",
      under: [cardId],
      opponentDp: [9000],
    });

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("base").permanentId)).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("target0").permanentId,
    ]);
    assertNoLoudGap(s);
  });

  it("does not raise the maximum during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: liskmon, as: "host", under: [cardId] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("host").permanentId)).toBe(0);
  });
});
