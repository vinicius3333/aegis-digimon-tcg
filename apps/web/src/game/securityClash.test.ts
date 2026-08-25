import { describe, expect, it } from "vitest";
import {
  buildSecurityBranchScene,
  buildSecurityBreakScene,
  buildSecurityClashScene,
  normalizeSecurityClashResolution,
  orderSecurityClashFighters,
  SECURITY_BRANCH_TIMINGS,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_AT_MS,
  SECURITY_BREAK_TIMINGS,
  SECURITY_BREAK_TOTAL_MS,
  SECURITY_CLASH_TIMINGS,
  SECURITY_CLASH_TOTAL_MS,
} from "./securityClash";

// Agumon is a Digimon with DP; Brave Shield is an Option, so it has none to compare.
const DIGIMON_CARD_ID = "BT1-010";
const OPTION_CARD_ID = "BT1-095";

describe("security clash scene", () => {
  it("faces the attacker at the checked player from the viewer's own half", () => {
    const scene = buildSecurityClashScene({
      key: 1,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
      attacker: { seat: 0, cardId: DIGIMON_CARD_ID },
    });

    expect(scene.revealed.side).toBe("opp");
    expect(scene.attacker?.side).toBe("you");
    expect(orderSecurityClashFighters(scene).map((slot) => slot.role)).toEqual(["revealed", "attacker"]);
  });

  it("puts the opponent's attacker above the viewer's revealed card", () => {
    const scene = buildSecurityClashScene({
      key: 2,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "trashed",
      defenderSeat: 0,
      viewerSeat: 0,
      attacker: { seat: 1, cardId: DIGIMON_CARD_ID },
    });

    expect(scene.revealed.side).toBe("you");
    expect(scene.attacker?.side).toBe("opp");
    expect(orderSecurityClashFighters(scene).map((slot) => slot.role)).toEqual(["attacker", "revealed"]);
  });

  it("shows the revealed card alone when no attack opened the check", () => {
    const scene = buildSecurityClashScene({
      key: 3,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "effect",
      defenderSeat: 0,
      viewerSeat: 0,
    });

    expect(scene.attacker).toBeUndefined();
    expect(orderSecurityClashFighters(scene)).toHaveLength(1);
  });

  it("drops an attack context that belongs to the checked player", () => {
    const scene = buildSecurityClashScene({
      key: 4,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 0,
      viewerSeat: 0,
      attacker: { seat: 0, cardId: DIGIMON_CARD_ID },
    });

    expect(scene.attacker).toBeUndefined();
  });

  it("compares DP only for Digimon", () => {
    const digimon = buildSecurityClashScene({
      key: 5,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
    });
    const other = buildSecurityClashScene({
      key: 6,
      revealedCardId: OPTION_CARD_ID,
      resolution: "effect",
      defenderSeat: 1,
      viewerSeat: 0,
    });

    expect(digimon.revealed.dp).toBeGreaterThan(0);
    expect(other.revealed.dp).toBeUndefined();
  });

  it("falls back to the trashed outcome for an unknown resolution", () => {
    expect(normalizeSecurityClashResolution("battle")).toBe("battle");
    expect(normalizeSecurityClashResolution("something-new")).toBe("trashed");
  });

  it("keeps the whole scene under three seconds", () => {
    const beats = Object.values(SECURITY_CLASH_TIMINGS).reduce((total, beat) => total + beat, 0);
    expect(SECURITY_CLASH_TOTAL_MS).toBe(beats);
    expect(SECURITY_CLASH_TOTAL_MS).toBeLessThan(3000);
  });
});

describe("shield break and the security-effect branch", () => {
  it("breaks the checked player's own shield, mirrored per seat", () => {
    expect(buildSecurityBreakScene({ key: 1, defenderSeat: 0, viewerSeat: 0 })).toEqual({
      key: 1,
      seat: 0,
      side: "you",
    });
    expect(buildSecurityBreakScene({ key: 2, defenderSeat: 1, viewerSeat: 0 })).toEqual({
      key: 2,
      seat: 1,
      side: "opp",
    });
  });

  it("branches only for a card that resolves an effect", () => {
    const branch = (resolution: string) =>
      buildSecurityBranchScene({ key: 3, revealedCardId: OPTION_CARD_ID, resolution, defenderSeat: 1, viewerSeat: 0 });

    expect(branch("effect")).toEqual({ key: 3, cardId: OPTION_CARD_ID, side: "opp" });
    expect(branch("battle")).toBeNull();
    expect(branch("trashed")).toBeNull();
    expect(branch("nonsense-from-a-future-server")).toBeNull();
  });

  it("runs the break before the reveal and the branch after the clash", () => {
    expect(SECURITY_BREAK_AT_MS).toBe(SECURITY_BREAK_TIMINGS.armMs);
    expect(SECURITY_BREAK_TOTAL_MS).toBe(
      SECURITY_BREAK_TIMINGS.armMs + SECURITY_BREAK_TIMINGS.breakMs + SECURITY_BREAK_TIMINGS.holdMs,
    );
    expect(SECURITY_BRANCH_TOTAL_MS).toBe(
      SECURITY_BRANCH_TIMINGS.inMs + SECURITY_BRANCH_TIMINGS.holdMs + SECURITY_BRANCH_TIMINGS.outMs,
    );
    // The revealed card is readable centre-stage before it slides aside.
    expect(SECURITY_BRANCH_TIMINGS.holdMs).toBeGreaterThan(SECURITY_BRANCH_TIMINGS.inMs);
  });
});

describe("security battle outcome", () => {
  const attacker = { seat: 0 as const, cardId: DIGIMON_CARD_ID, permanentId: "att", topInstanceId: "att-top" };

  it("marks the attacker beaten when the check named it in a deletion", () => {
    const scene = buildSecurityClashScene({
      key: 1,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
      attacker,
      attackerDeleted: true,
    });
    expect(scene.attackerDeleted).toBe(true);
  });

  it("leaves the outcome unmarked when no deletion named the attacker", () => {
    const scene = buildSecurityClashScene({
      key: 1,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
      attacker,
    });
    expect(scene.attackerDeleted).toBeUndefined();
  });

  it("never marks an outcome for a check with no attacker facing it", () => {
    const scene = buildSecurityClashScene({
      key: 1,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
      attackerDeleted: true,
    });
    expect(scene.attacker).toBeUndefined();
    expect(scene.attackerDeleted).toBeUndefined();
  });
});
