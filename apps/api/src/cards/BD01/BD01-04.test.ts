import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";

const cardId = "BD01-04";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";

type BoardParams = { opponentMemory: number; turnSeat?: 0 | 1 };

async function boardWithGreymonUnderHost({ opponentMemory, turnSeat = 0 }: BoardParams) {
  const s = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel5, as: "host", under: [cardId] }] } });
  s.state.turnSeat = turnSeat;
  s.state.memory = turnSeat === 0 ? -opponentMemory : opponentMemory;
  await s.ready();
  return s;
}

describe("BD01-04 Greymon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "Greymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dinosaur"],
      rarity: "C",
      inheritedEffectText: "[Your Turn] While your opponent has 4 or more memory, this Digimon gets +3000 DP.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from a red level 3 Digimon for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: vanillaRedLevel3, as: "base" }],
        hand: [{ card: cardId, as: "greymon" }],
        deck: [vanillaRedLevel3],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([vanillaRedLevel3]);
    expect(s.state.memory).toBe(3);
  });

  it("gives its host +3000 DP while the opponent has exactly 4 memory", async () => {
    const s = await boardWithGreymonUnderHost({ opponentMemory: 4 });

    expect(s.perm("host").currentDP).toBe(6000 + 3000);
    assertNoLoudGap(s);
  });

  it("gives nothing while the opponent has 3 memory", async () => {
    const s = await boardWithGreymonUnderHost({ opponentMemory: 3 });

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("gives nothing during the opponent's turn even when they have 4 or more memory", async () => {
    const s = await boardWithGreymonUnderHost({ opponentMemory: 6, turnSeat: 1 });

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("does not apply while Greymon itself is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "greymon", under: [vanillaRedLevel3] }] } });
    s.state.memory = -5;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(4000);
  });
});
