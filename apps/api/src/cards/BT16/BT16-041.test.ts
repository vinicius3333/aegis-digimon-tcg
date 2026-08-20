import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-041.js";

describe("BT16-041", () => {
  it("models Retaliation", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
  });

  it("suspends an opposing Digimon on play, digivolution, and as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] });
  });
});
