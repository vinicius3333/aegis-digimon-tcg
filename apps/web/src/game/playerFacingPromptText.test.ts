import { describe, expect, it } from "vitest";
import { playerFacingPromptText } from "./overlay";

it("uses the generic activation question for Examon's printed optional clause", () => {
  expect(
    playerFacingPromptText(
      "You may play or use 1 play or use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards without paying the cost",
      "optional",
    ),
  ).toBeUndefined();
});

describe("playerFacingPromptText", () => {
  it("keeps the engine's own question for an optional effect", () => {
    expect(playerFacingPromptText("Activate Blitz?", "optional")).toBe("Activate Blitz?");
    expect(playerFacingPromptText("Trash 1 card to reduce the play cost", "optional")).toBe(
      "Trash 1 card to reduce the play cost",
    );
  });

  it("drops an action summary the printed clause already carries", () => {
    expect(playerFacingPromptText("Draw 2", "optional")).toBeUndefined();
    expect(playerFacingPromptText("Gain 2 memory", "optional")).toBeUndefined();
    expect(playerFacingPromptText("GainMemory", "optional")).toBeUndefined();
  });

  it("drops the summary of an optional processing cost (BT20-083 from breeding)", () => {
    expect(
      playerFacingPromptText("By paying: Suspend 1 card(s) → Play without paying the cost", "optional"),
    ).toBeUndefined();
  });

  it("only filters summaries on optional decisions", () => {
    expect(playerFacingPromptText("Draw 2", "selectCards")).toBe("Draw 2");
  });
});
