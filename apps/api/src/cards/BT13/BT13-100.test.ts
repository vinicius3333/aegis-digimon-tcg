import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-100.js";

describe("BT13-100 BT13-100", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-100", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-100");
  });
});
