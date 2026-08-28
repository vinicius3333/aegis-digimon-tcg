import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-030.js";

describe("EX1-030 Angewomon", () => {
  it("gives an opposing Digimon and all opposing Security Digimon -3000 DP on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-030", as: "angewomon" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000 && observe(s.engine).securityDp(1) === -3000, 5000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });

  it("gives an opposing Digimon -2000 DP when a card is added to your security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-030"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
