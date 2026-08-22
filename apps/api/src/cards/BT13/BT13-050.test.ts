import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-050.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-050 Sunflowmon", () => {
  it("charges suspension for the Fairy digivolution and reduces its cost by two", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Main", actions: expect.arrayContaining([expect.objectContaining({ kind: "Digivolve", optional: true, abortOnDecline: true, cost: expect.objectContaining({ kind: "suspend" }), into: expect.objectContaining({ nameOrTrait: [{ tokens: ["Fairy"], match: "trait" }] }) })]) });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })] });
  });

  it("loads the compiled Sunflowmon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }] } });
    await s.ready();
    expect(s.perm("sunflow").topCard?.cardId).toBe("BT13-050");
  });
});
