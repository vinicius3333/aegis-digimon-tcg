import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-054.js";

describe("BT26-054 Andromon", () => {
  it("encodes CS Tamer play exclusion, CS stack-add digivolution, and inherited attack redirect", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "Digivolve", from: ["hand"], payCost: false }] }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "RedirectAttack", optional: true }] });
  });
});
