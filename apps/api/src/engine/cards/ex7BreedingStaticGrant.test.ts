import { describe, expect, it } from "vitest";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/EX7/EX7-010.js";
import "../../cards/EX7/EX7-071.js";

describe("EX7-010 Q3831 breeding-area static grant", () => {
  it("does not expose the breeding source's Three Musketeers grant to Option color legality", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX7-010", as: "deputy" }, hand: [{ card: "EX7-071", as: "option" }] },
      1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
    });
    await s.ready();

    const deputy = s.perm("deputy");
    const continuous = (
      s.engine as unknown as {
        continuous: { grantedTraits(permanentId: string): string[] };
      }
    ).continuous;
    expect(deputy.inBreeding).toBe(true);
    expect(continuous.grantedTraits(deputy.permanentId)).toEqual([]);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(deputy.stack).toHaveLength(0);
  });
});
