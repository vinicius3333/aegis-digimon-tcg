import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-13.js";

describe("ST19-13 ShinMonzaemon", () => {
  it("matches Armor Purge and recovery-from-trash wording", () => {
    const card = getCardDefinition("ST19-13");
    expect(card.effectText).toContain("＜Armor Purge＞");
    expect(card.effectText).toContain("＜Recovery +1 (Deck)＞");
  });
});
