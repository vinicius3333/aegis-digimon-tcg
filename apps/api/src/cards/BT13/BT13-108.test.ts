import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-108.js";

describe("BT13-108 BT13-108", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-108", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-108");
  });
});
