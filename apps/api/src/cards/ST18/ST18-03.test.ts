import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-03 Falcomon", () => {
  it("suspends an opponent Digimon when it attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-03", as: "attacker" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim" }] },
      },
      { autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended || s.events.some((event) => event.kind === "attackResolved"));

    expect(s.perm("victim").isSuspended).toBe(true);
  });
});
