import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-069.js";

describe("EX2-069 Fist of the Beast King", () => {
  it("unsuspends Leomon or Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-044", as: "beelzemon", suspended: true }, "EX2-014"],
          hand: [{ card: "EX2-069", as: "option" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("beelzemon").isSuspended);
    expect(s.perm("beelzemon").isSuspended).toBe(false);
  });
});
