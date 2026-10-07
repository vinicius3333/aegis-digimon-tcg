import { describe, expect, it } from "vitest";
import { cardEffectClauseForTiming } from "./effectText";

describe("printed clause lookup", () => {
  it("stops a clause at a timing printed with a typographic apostrophe (BT13-103 [End of Opponent’s Turn])", () => {
    expect(cardEffectClauseForTiming("BT13-103", "YourTurn")).toBe(
      "[Your Turn] When a card with [Belphemon] in its name would be played, by deleting 1 of your Digimon with [Gizmon] in its name, reduce the play cost by the play cost of the deleted Digimon.",
    );
    expect(cardEffectClauseForTiming("BT13-103", "EndOfOpponentsTurn")).toMatch(
      /^\[End of Opponent’s Turn\]\[Once Per Turn\] ＜Draw 1＞/,
    );
  });
});
