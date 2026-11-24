import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "ST25-02";
const tokomon = "ST25-01";
const koromon = "ST1-01";
const tsunomon = "ST2-01";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";

describe("ST25-02 Gemmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Gemmon",
      nameJp: "ジェムモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mythical Beast", "ALYSION"],
      rarity: "R",
      effectText:
        "[Digivolve] Lv.2 w/[Gemmon] in text: Cost 0\n[When Moving] [On Play] 1 of your Digimon gets +3000 DP for the turn.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("accepts a level 2 base with [Gemmon] in its text through the alternate requirement only", () => {
    expect(matchingAlternateDigivolutionRequirement(cardId, tokomon)).toMatchObject({ level: 2, cost: 0 });
    expect(matchingAlternateDigivolutionRequirement(cardId, koromon)).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement(cardId, tsunomon)).toBeUndefined();
  });

  it("gives the chosen Digimon +3000 DP for the turn on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaRedLevel5, as: "ally" }],
          hand: [{ card: cardId, as: "gemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 9000);

    expect(s.perm("ally").currentDP).toBe(6000 + 3000);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("gives +3000 DP when it moves out of the breeding area", async () => {
    const s = setupEngine(
      { 0: { breeding: { card: cardId, as: "gemmon", under: [tokomon] } } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("gemmon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gemmon").currentDP === 1000 + 3000);

    expect(s.perm("gemmon").currentDP).toBe(1000 + 3000);
  });

  it("gives its host +2000 DP during your turn only", async () => {
    const yourTurn = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel3, as: "host", under: [cardId] }] } });
    await yourTurn.ready();
    expect(yourTurn.perm("host").currentDP).toBe(3000 + 2000);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel3, as: "host", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(3000);
  });
});
