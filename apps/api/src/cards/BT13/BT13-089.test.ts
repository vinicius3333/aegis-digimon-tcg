import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-089.js";

describe("BT13-089 BT13-089", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
  });

  it("only plays Ravemon after deleting a Ravemon with a Bird or Avian stack card", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost", from: ["trash"], target: { filter: { controller: "mine", name: "Ravemon" } },
      condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ match: "trait", tokens: ["Bird"] }, { match: "trait", tokens: ["Avian"] }] } },
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-089", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-089");
  });
});
