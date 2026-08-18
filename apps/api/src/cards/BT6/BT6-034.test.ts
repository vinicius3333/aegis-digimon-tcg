import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-034.js";
import "./BT6-041.js";

describe("BT6-034 Wizardmon", () => {
  it("gains 1 memory when its host removes a card from your security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-041", under: ["BT6-034"], as: "host" }], security: ["BT1-001"] },
      1: { battleArea: ["BT6-016"], security: ["BT1-010"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
