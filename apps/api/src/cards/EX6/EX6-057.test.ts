import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-057.js";

describe("EX6-057 Lilithmon", () => {
  it("contains the granted end-of-turn deletion and once-per-turn protection IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("GainTriggeredEffect");
    expect(text).toContain("wouldLeavePlay");
    expect(text).toContain("OncePerTurn");
  });
  it("trashes opponent security only when an opposing Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], excludeSelf: true },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    }));
});
