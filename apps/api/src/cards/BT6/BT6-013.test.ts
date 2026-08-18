import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-013.js";

describe("BT6-013 Hackmon", () => {
  function effectiveColors(s: ReturnType<typeof setupEngine>, permanent: Permanent): string[] {
    return (s.engine as unknown as {
      effectiveColorsOf(target: Permanent): string[];
    }).effectiveColorsOf(permanent);
  }

  it("Q1407 is also treated as black in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-013", as: "megadramon" }] } });
    await s.ready();

    expect(effectiveColors(s, s.perm("megadramon"))).toEqual(
      expect.arrayContaining(["Red", "Black"]),
    );
  });

  it("Q1408 is not treated as black in the breeding area", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT6-013", as: "megadramon" } } });
    await s.ready();

    expect(effectiveColors(s, s.perm("megadramon"))).toEqual(["Red"]);
  });

  it("gives its host +2000 DP on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-013"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
