import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-01 Fluffymon", () => {
  it("suspends one other Digimon with DP no greater than the attacking host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] }] },
        1: {
          battleArea: [
            { card: "ST18-03", dp: 2000, as: "eligible" },
            { card: "ST18-03", dp: 4000, as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("eligible").isSuspended || s.events.some((event) => event.kind === "attackResolved"));

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });
});
