import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-086.js";

describe("BT14-086", () => {
  it("grants memory and Mind Links to the printed Numemon/Monzaemon/DigiPolice targets", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }, { kind: "PlaceUnder" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura" }, { kind: "Aura" }] });
  });

  it("plays itself from security and Satsuki from its digivolution cards", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
