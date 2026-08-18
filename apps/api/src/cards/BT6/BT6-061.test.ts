import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-061.js";

describe("BT6-061 Gigadramon", () => {
  function effectiveColors(s: ReturnType<typeof setupEngine>, permanent: Permanent): string[] {
    return (s.engine as unknown as {
      effectiveColorsOf(target: Permanent): string[];
    }).effectiveColorsOf(permanent);
  }

  it("Q1455 is also treated as red in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-061", as: "gigadramon" }] } });
    await s.ready();

    expect(effectiveColors(s, s.perm("gigadramon"))).toEqual(
      expect.arrayContaining(["Black", "Red"]),
    );
  });

  it("Q1456 is not treated as red in the breeding area", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT6-061", as: "gigadramon" } } });
    await s.ready();

    expect(effectiveColors(s, s.perm("gigadramon"))).toEqual(["Black"]);
  });

  it("gives its host +2000 DP on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-061"], as: "host" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
