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
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "onAddDigivolutionCards" })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
