import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-019.js";

describe("BT17-019", () => {
  it("draws if you have a Matt Ishida Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Draw", amount: 1, condition: { kind: "youHave" } }] });
  });

  it("can DNA digivolve using itself and another Digimon at end of turn as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfYourTurn", isInherited: true, actions: [{ kind: "DnaDigivolve", payCost: true, optional: true, materials: [{ count: 1 }, { count: 1, zone: "battleArea" }] }] });
  });
});
