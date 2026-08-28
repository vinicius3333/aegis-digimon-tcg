import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-029.js";

describe("EX1-029 MagnaAngemon", () => {
  it("gets +4000 DP when attacking with 3 or more security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }], security: ["BT1-001", "BT1-001", "BT1-001"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").currentDP === 11000);
    expect(s.perm("magna").currentDP).toBe(11000);
  });

  it("gains 1 memory when a card is added to your security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }] } });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.state.memory).toBe(6);
  });
});
