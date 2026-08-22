import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-003.js";

describe("BT20-003 Bibimon", () => {
  it("proves the inherited end-of-turn placement is optional and once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      target: { count: 1 },
      underFilter: { kind: ["Digimon", "Tamer"] },
    });
  });
});
