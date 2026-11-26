import { describe, expect, it } from "vitest";
import { getCardDefinition } from "#shared/cards/registry";
import { isUnreleasedInFormat } from "#shared/decks/isUnreleasedInFormat";

function card(cardId: string) {
  const definition = getCardDefinition(cardId);
  if (!definition) throw new Error(`missing ${cardId}`);
  return definition;
}

describe("isUnreleasedInFormat", () => {
  it("treats Story Decks the app already released as released only in Alysion", () => {
    expect(isUnreleasedInFormat(card("SD01-02"), "alysion", "2026-11-30")).toBe(false);
    expect(isUnreleasedInFormat(card("SD01-02"), "standard", "2026-11-30")).toBe(true);
    expect(isUnreleasedInFormat(card("SD01-02"), "alysion", "2026-11-24")).toBe(true);
  });

  it("keeps unannounced Alysion sets unreleased in every format", () => {
    for (const cardId of ["BD05-08", "BD06-06", "SD03-05"])
      expect(isUnreleasedInFormat(card(cardId), "alysion", "2026-11-30")).toBe(true);
  });
});
