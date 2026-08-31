import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import {
  buildSecurityBranchScene,
  buildSecurityBreakScene,
  buildSecurityClashScene,
  buildSecurityDestructionScene,
  normalizeSecurityClashResolution,
  orderSecurityClashFighters,
  SECURITY_BRANCH_TIMINGS,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_AT_MS,
  SECURITY_BREAK_TIMINGS,
  SECURITY_BREAK_TOTAL_MS,
  SECURITY_CLASH_TIMINGS,
  SECURITY_CLASH_TOTAL_MS,
  SECURITY_DESTROY_OUTCOME_AT_MS,
  securityDestructionsFromEvents,
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

  const sceneWith = (battle?: { attackerDeleted: boolean; securityDigimonDeleted: boolean }, withAttacker = true) =>
    buildSecurityClashScene({
      key: 1,
      revealedCardId: DIGIMON_CARD_ID,
      resolution: "battle",
      defenderSeat: 1,
      viewerSeat: 0,
      ...(withAttacker ? { attacker } : {}),
      ...(battle ? { battle } : {}),
    });

  it("names the attacker as the loser when it lost the compare", () => {
    expect(sceneWith({ attackerDeleted: true, securityDigimonDeleted: false }).loser).toEqual({
      attacker: true,
      revealed: false,
    });
  });

  it("names the security Digimon as the loser in the other direction", () => {
    expect(sceneWith({ attackerDeleted: false, securityDigimonDeleted: true }).loser).toEqual({
      attacker: false,
      revealed: true,
    });
  });

  it("names both on a tie", () => {
    expect(sceneWith({ attackerDeleted: true, securityDigimonDeleted: true }).loser).toEqual({
      attacker: true,
      revealed: true,
    });
  });

  it("leaves the outcome unmarked when the server published no compare", () => {
    expect(sceneWith(undefined).loser).toBeUndefined();
  });

  it("never marks an outcome for a check with no attacker facing it", () => {
    const scene = sceneWith({ attackerDeleted: true, securityDigimonDeleted: false }, false);
    expect(scene.attacker).toBeUndefined();
    expect(scene.loser).toBeUndefined();
  });
});

describe("security destroyed by an effect", () => {
  const lookup = {
    cardId: (instanceId: string) => ({ "i-1": DIGIMON_CARD_ID, "i-2": OPTION_CARD_ID })[instanceId],
    seat: (instanceId: string) => (instanceId === "i-1" || instanceId === "i-2" ? (1 as const) : undefined),
  };
  const trashed = (instanceIds: string[]): ServerEvent => ({
    kind: "cardsMoved",
    instanceIds,
    from: "security",
    to: "trash",
  });

  it("names every card a movement out of security into the trash spent, in order", () => {
    expect(securityDestructionsFromEvents([trashed(["i-1", "i-2"])], lookup)).toEqual([
      { cardId: DIGIMON_CARD_ID, seat: 1 },
      { cardId: OPTION_CARD_ID, seat: 1 },
    ]);
  });

  it("ignores movements that are not a security stack being spent", () => {
    const elsewhere: ServerEvent[] = [
      { kind: "cardsMoved", instanceIds: ["i-1"], from: "security", to: "hand" },
      { kind: "cardsMoved", instanceIds: ["i-1"], from: "battleArea", to: "trash" },
      { kind: "cardsMoved", instanceIds: ["i-1"], from: "security", to: "security" },
    ];
    expect(securityDestructionsFromEvents(elsewhere, lookup)).toEqual([]);
  });

  it("drops a card the board cannot name rather than drawing an anonymous back", () => {
    expect(securityDestructionsFromEvents([trashed(["i-unknown"])], lookup)).toEqual([]);
  });

  // The reported bug: the event is broadcast before the state patch that lands the
  // card in the trash, so the index sometimes cannot name it yet and the scene was
  // silently dropped. The event now carries the identities itself.
  it("names the cards from the event before the board index has caught up", () => {
    const enriched: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["i-not-indexed-yet", "i-also-pending"],
      from: "security",
      to: "trash",
      cardIds: [DIGIMON_CARD_ID, OPTION_CARD_ID],
      seat: 0,
    };
    const emptyLookup = { cardId: () => undefined, seat: () => undefined };
    expect(securityDestructionsFromEvents([enriched], emptyLookup)).toEqual([
      { cardId: DIGIMON_CARD_ID, seat: 0 },
      { cardId: OPTION_CARD_ID, seat: 0 },
    ]);
  });

  it("stages the card alone, already spent, on the destruction clock", () => {
    const scene = buildSecurityDestructionScene({
      key: 3,
      cardId: DIGIMON_CARD_ID,
      trashedSeat: 1,
      viewerSeat: 0,
    });
    expect(scene.attacker).toBeUndefined();
    expect(scene.revealed).toEqual({ cardId: DIGIMON_CARD_ID, side: "opp", dp: 2000 });
    expect(scene.resolution).toBe("trashed");
    expect(scene.cause).toBe("destruction");
    expect(scene.outcomeAtMs).toBe(SECURITY_DESTROY_OUTCOME_AT_MS);
  });
});
