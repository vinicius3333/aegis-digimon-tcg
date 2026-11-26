import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-01";

const cardId = "SD03-01";
const gemmon = "SD03-02";
const alysionHost = "BD06-05";
const vegetationHost = "BT1-065";

describe("SD03-01 Tokomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Tokomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "ALYSION"],
      inheritedEffectText: "[Your Turn] This suspended Digimon with the [ALYSION] trait gets +1000 DP.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
  });

  it("compiles the inherited Your Turn suspended ALYSION aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { isSelf: true },
            effect: { kind: "modifyDP", amount: 1000 },
            while: {
              kind: "allOf",
              conditions: [
                { kind: "selfIsSuspended" },
                { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] } },
              ],
            },
          },
        ],
      },
    ]);
  });

  it("gives +1000 DP during your turn only to a suspended ALYSION host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId, gemmon] },
          { card: alysionHost, as: "activeAlysion", under: [cardId] },
          { card: vegetationHost, as: "suspendedVegetation", suspended: true, under: [cardId] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(9000);
    expect(s.perm("activeAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedVegetation").currentDP).toBe(4000);

    await advance(s.engine).verb.suspend([s.perm("activeAlysion").permanentId]);
    expect(s.perm("activeAlysion").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });

  it("gives no DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(7000);
  });
});
