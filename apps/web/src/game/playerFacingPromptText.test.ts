import { describe, expect, it } from "vitest";
import { playerFacingPromptText } from "./overlays";

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

  it("only filters summaries on optional decisions", () => {
    expect(playerFacingPromptText("Draw 2", "selectCards")).toBe("Draw 2");
  });
});
