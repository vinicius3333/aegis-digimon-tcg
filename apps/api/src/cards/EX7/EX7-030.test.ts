import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-030.js";

describe("EX7-030", () => {
  it("creates a Familiar token at the start of the main phase and on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "PlayToken", tokens: ["Familiar"], count: 1, payCost: false, optional: true });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayToken", tokens: ["Familiar"] });
  });
  it("attacks at end of turn by Overclock cost and reduces an opposing Digimon by 6000 DP when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({ kind: "Attack", attackPlayer: true, withoutSuspending: true, cost: { kind: "deleteOwn" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -6000, duration: "forTheTurn" });
  });
});
