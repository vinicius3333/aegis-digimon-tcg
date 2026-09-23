import { allCards, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { cardEffectClauseForTiming, playerFacingEffectClause } from "./effectText";

const linkedCards = allCards().filter(({ linkEffect }) => linkEffect?.includes("[When Linking]"));

describe("[When Linking] printed text", () => {
  it("shows Logimon's link-box clause for both engine timing names", () => {
    const linkEffect = getCardDefinition("BT25-052")!.linkEffect!;
    expect(cardEffectClauseForTiming("BT25-052", "OnLinking")).toBe(linkEffect.trim());
    expect(cardEffectClauseForTiming("BT25-052", "WhenLinking")).toBe(linkEffect.trim());
    expect(playerFacingEffectClause({ cardId: "BT25-052", timing: "OnLinking", description: undefined })).toContain(
      "Suspend 1 of your opponent's Digimon or Tamers",
    );
  });

  it("finds the link-box clause for every card that prints [When Linking]", () => {
    expect(linkedCards.length).toBeGreaterThan(0);
    const missing = linkedCards
      .filter(({ cardId }) => !cardEffectClauseForTiming(cardId, "OnLinking")?.includes("[When Linking]"))
      .map(({ cardId }) => cardId);
    expect(missing).toEqual([]);
  });
});
