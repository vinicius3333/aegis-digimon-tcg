import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-082.js";

describe("BT21-082 Takuya Kanbara", () => {
  it("plays from security, enables paid Hybrid/Hero digivolution, and gates the inherited trigger to opponent security", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security" }));
    const mainAction = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0];
    expect(mainAction).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      reduceCostScaling: { unit: "distinctNames" },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
  });
});
