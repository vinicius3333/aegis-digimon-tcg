import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-073.js";
describe("BT21-073 Charismon", () => {
  it("links from trash or stack and grants the once-per-turn attack token", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenLinked" })],
      }),
    );
  });
});
