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

/**
 * The reveal hints (`hasSecurityEffect`, `isDigimon`) are read at the engine seam, from the
 * same [Security] effect lookup `resolveSecurityEffect` performs, so the client can dock a
 * card with a [Security] effect for the whole resolution instead of guessing from the close.
 */
describe("securityRevealed presentation hints", () => {
  type RevealedEvent = Extract<ServerEvent, { kind: "securityRevealed" }>;

  async function reveal(securityCardId: string): Promise<RevealedEvent> {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: { security: [{ card: securityCardId }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "securityRevealed"));
    const event = s.events.find((e): e is RevealedEvent => e.kind === "securityRevealed");
    expect(event).toBeDefined();
    return event as RevealedEvent;
  }

  it("marks a Digimon without a [Security] effect as isDigimon only", async () => {
    const event = await reveal("AD1-001");
    expect(event.isDigimon).toBe(true);
    expect(event.hasSecurityEffect).toBe(false);
  });

  it("marks an Option with a [Security] effect as hasSecurityEffect, not a Digimon", async () => {
    const event = await reveal("BT1-093");
    expect(event.hasSecurityEffect).toBe(true);
    expect(event.isDigimon).toBe(false);
  });
});

/** The player-directed win on empty security is untouched by the ＜Piercing＞ guard. */
describe("a player-directed attack into empty security", () => {
  it("wins the game", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: { security: [] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver);

    expect(s.state.winnerSeat).toBe(0);
    expect(s.events.some((e) => e.kind === "gameOver" && e.reason === "security")).toBe(true);
  });
});
