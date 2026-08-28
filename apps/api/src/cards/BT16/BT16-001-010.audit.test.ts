import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT16-001–010 audit", () => {
  it("BT16-003 grants Blocker only while its host has multiple colors", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-007", as: "multicolor", under: [{ card: "BT16-003", as: "egg" }] }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("multicolor").permanentId, "Blocker")).toBe(true);
  });
});
