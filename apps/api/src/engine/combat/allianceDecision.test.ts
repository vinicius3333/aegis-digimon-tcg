import { describe, it, expect } from "vitest";
import { type ServerEvent } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX11/EX11-024.js";

const ALLIANCE_CARD = "EX11-024"; // Cendrillmon — printed ＜Alliance＞ (compiled to a Static GainKeyword)
const PLAIN = "AD1-001";

describe("＜Alliance＞ decision resolution", () => {
  it("accepts a valid ally, adds its DP, and emits allianceResolved so the client can dismiss the prompt", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: ALLIANCE_CARD, dp: 9000, as: "attacker" },
          { card: PLAIN, dp: 4000, as: "ally" },
        ],
      },
      1: { battleArea: [{ card: PLAIN, dp: 1000, suspended: true, as: "defender" }] },
    });
    const attacker = s.perm("attacker");
    const ally = s.perm("ally");
    const defender = s.perm("defender");

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

    await settle(() => ally.isSuspended, 3000);
    expect(ally.isSuspended).toBe(true);
    expect(attacker.currentDP).toBe(13000); // 9000 + the ally's 4000 DP for the battle
  });
});
