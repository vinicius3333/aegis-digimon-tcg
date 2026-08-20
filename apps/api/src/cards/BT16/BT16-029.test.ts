import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-029.js";

describe("BT16-029", () => {
  it("reveals three and adds Light Fang, Night Claw, or multicolor cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ add: [{ count: 1, to: "hand" }, { count: 1, to: "hand", orFilters: [{ multicolor: true }] }] });
  });

  it("reduces opposing Digimon DP by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: -3000, duration: "permanent" }] });
  });
});
