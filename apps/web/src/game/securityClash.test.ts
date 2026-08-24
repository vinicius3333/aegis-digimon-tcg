import { describe, expect, it } from "vitest";
import {
  buildSecurityClashScene,
  normalizeSecurityClashResolution,
  orderSecurityClashFighters,
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
