import { describe, it, expect } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { setupEngine, settle } from "./testkit/harness.js";
// Self-register every card module so the EX5-053 OnSecurityCheck reaction is the real one.
import "../cards/index.js";

type EffectTriggeredEvent = Extract<ServerEvent, { kind: "effectTriggered" }>;

/**
 * `securityChecked` closes a check, so every effect the check fires announces itself
 * BEFORE that event reaches the client. The `duringSecurityCheck` stamp is what lets the
 * client hold those announcements until the revealed card has actually been shown —
 * without it, the effect notice reads out ahead of the security clash animation.
 *
 * Driven through a real `attack` intent so the stamp is proven at the engine seam
 * (GameEngine.securityCheckDepth around runSecurityCheck), not at a mocked dep.
 */
describe("effect announcements fired inside a security check", () => {
  it("stamps duringSecurityCheck on effectTriggered emitted ahead of the closing securityChecked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: {
        // Baihumon reacts to its controller's security being checked (OnSecurityCheck).
        battleArea: [{ card: "EX5-053", dp: 12000 }],
        security: [{ card: "BT10-079" }], // Sandiramon — [Deva], so the reaction fires
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "securityChecked"));

    const checkIndex = s.events.findIndex((e) => e.kind === "securityChecked");
    const triggeredInside = s.events
      .slice(0, checkIndex)
      .filter((e): e is EffectTriggeredEvent => e.kind === "effectTriggered");
    expect(triggeredInside.length).toBeGreaterThan(0);
    for (const event of triggeredInside) {
      expect(event.duringSecurityCheck).toBe(true);
    }
  });
});
