import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-075.js";

describe("BT16-075", () => {
  it("returns a Dark Animal or Shaman Digimon from trash on play or digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash" }, count: 1 } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash" }, count: 1 } }] });
  });

  it("grants Rush to one of your Digimon when one is played as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn" }] }] });
  });
});
