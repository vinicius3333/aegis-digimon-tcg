import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/SD01/SD01-01";

const cardId = "SD01-01";
const gemmon = "SD01-02";
const liskmon = "SD01-03";
const vanillaRedLevel3 = "BT1-009";

describe("SD01-01 Tokomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Tokomon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      rarity: "U",
      inheritedEffectText: "[Your Turn] This Digimon with the [ALYSION] trait gets +1000 DP.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
  });

  it("compiles the inherited clause as a Your Turn self boost gated by the ALYSION trait", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 1000,
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

  it("gives Gemmon +1000 DP after Gemmon digivolves from Tokomon for 0 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: cardId, as: "base" }],
        hand: [{ card: gemmon, as: "gemmon" }],
        deck: [vanillaRedLevel3],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gemmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === gemmon);

    expect(s.perm("base").currentDP).toBe(2000);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("stacks with Gemmon's inherited +1000 under an ALYSION Liskmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: liskmon, as: "host", under: [cardId, gemmon] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000 + 1000 + 1000);
  });

  it("gives nothing to a host without the ALYSION trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel3, as: "host", under: [cardId] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("gives nothing during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: gemmon, as: "host", under: [cardId] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(1000);
  });
});
