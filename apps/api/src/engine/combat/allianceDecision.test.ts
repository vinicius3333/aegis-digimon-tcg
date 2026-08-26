import { describe, it, expect } from "vitest";
import { type ServerEvent } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX11/EX11-024.js";
import "../../cards/ST18/ST18-07.js";

const ALLIANCE_CARD = "EX11-024"; // Cendrillmon — printed ＜Alliance＞ (compiled to a Static GainKeyword)
const PLAIN = "AD1-001";

describe("＜Alliance＞ decision resolution", () => {
  it("accepts a valid ally, adds its DP, and emits allianceResolved so the client can dismiss the prompt", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: ALLIANCE_CARD, dp: 9000, as: "attacker" },
            { card: PLAIN, dp: 4000, as: "ally" },
          ],
        },
        1: {
          battleArea: [
            // EX11-024's When Attacking effect applies -6000 DP with these two allied
            // Digimon in play. Keep both candidates alive so the attack reaches the
            // Alliance and blocker decision windows this test exercises.
            { card: PLAIN, dp: 7000, suspended: true, as: "defender" },
            { card: "ST18-07", dp: 7000, as: "blocker" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    const attacker = s.perm("attacker");
    const ally = s.perm("ally");
    const defender = s.perm("defender");
    preferredTargets.push(defender.topCard.instanceId);

    // The printed ＜Alliance＞ is materialized as a Static keyword grant on recompute.
    await s.engine.recomputeContinuousEffects();
    expect(attacker.keywords).toContain("Alliance");

    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId },
    });
    expect(attack).toEqual({ ok: true });

    await settle(() => s.events.some((e) => e.kind === "alliancePrompt"), 3000);
    const prompt = s.events.find((e) => e.kind === "alliancePrompt") as
      | Extract<ServerEvent, { kind: "alliancePrompt" }>
      | undefined;
    expect(prompt).toBeDefined();
    expect(prompt!.eligibleAllyIds).toContain(ally.permanentId);

    const respond = s.engine.applyIntent(0, {
      type: "respondAlliance",
      allyPermanentId: ally.permanentId,
    });
    expect(respond).toEqual({ ok: true });

    // The engine must announce the decision closed; without this the prompt overlay
    // (which only dismisses on allianceResolved/combatResolved/gameOver/phaseChanged)
    // stays open through the ensuing block window and re-clicks are rejected.
    expect(s.events.some((e) => e.kind === "allianceResolved" && e.permanentId === attacker.permanentId)).toBe(true);

    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => ally.isSuspended && combat.hasOpenBlockWindow, 3000);
    expect(ally.isSuspended).toBe(true);
    expect(attacker.currentDP).toBe(13000); // 9000 + the ally's 4000 DP for the battle
    expect(attacker.securityAttack).toBe(2);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
  });
});
