import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";

const cardId = "BD04-02";
const vanilla = "BT1-009";
const vanillaMega = "ST1-10";

async function targetDpAfterAttackWith(ownSecurity: number) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: vanillaMega, as: "attacker", under: [cardId] }],
        security: Array.from({ length: ownSecurity }, () => vanilla),
      },
      1: {
        battleArea: [{ card: vanilla, as: "target" }],
        security: [vanilla, vanilla],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm("target").topCard!.instanceId);
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await drainMicrotasks(40);
  await advance(s.engine).finishAttack();
  return s.perm("target").currentDP;
}

describe("BD04-02 Garudamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Garudamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 2 }],
      types: ["Birdkin"],
      inheritedEffectText:
        "[When Attacking] If you have as many or fewer security cards as your opponent, 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives -2000 DP when you have as many security cards as your opponent", async () => {
    expect(await targetDpAfterAttackWith(2)).toBe(1000);
  });

  it("gives -2000 DP when you have fewer security cards than your opponent", async () => {
    expect(await targetDpAfterAttackWith(1)).toBe(1000);
  });

  it("gives no DP change when you have more security cards than your opponent", async () => {
    expect(await targetDpAfterAttackWith(3)).toBe(3000);
  });
});
