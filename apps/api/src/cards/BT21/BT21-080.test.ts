import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-080.js";

describe("BT21-080 Hiro Amanokawa", () => {
  it("implements the main-phase memory, digivolution-card trigger, and security play", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "onAddDigivolutionCards",
            triggerFilter: expect.objectContaining({
              nameOrTrait: [
                { tokens: ["Gammamon"], match: "text" },
                { tokens: ["Hero"], match: "trait", orPrevious: true },
              ],
            }),
            cost: expect.objectContaining({ kind: "suspend", target: expect.objectContaining({ isSelf: true }) }),
            optional: true,
            abortOnDecline: true,
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
