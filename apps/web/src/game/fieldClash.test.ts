import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { buildFieldClashScene, trackOpenAttack, type OpenAttack } from "./fieldClash";

const DECLARE_ON_PERMANENT: ServerEvent = {
  kind: "attackDeclared",
  seat: 0,
  attackerPermanentId: "perm-atk",
  attackerCardId: "BT1-010",
  target: { kind: "permanent", permanentId: "perm-def" },
  targetCardId: "BT1-020",
};

const DECLARE_ON_PLAYER: ServerEvent = {
  kind: "attackDeclared",
  seat: 1,
  attackerPermanentId: "perm-atk",
  attackerCardId: "BT1-010",
  target: { kind: "player" },
};

const COMBAT: ServerEvent & { kind: "combatResolved" } = {
  kind: "combatResolved",
  seat: 0,
  attackerPermanentId: "perm-atk",
  deletedPermanentIds: ["perm-def"],
};

function openAfter(events: readonly ServerEvent[]): OpenAttack | null {
  return events.reduce<OpenAttack | null>(trackOpenAttack, null);
}

describe("trackOpenAttack", () => {
  it("remembers a declaration on a permanent, target and all", () => {
    expect(openAfter([DECLARE_ON_PERMANENT])).toEqual({
      seat: 0,
      attackerPermanentId: "perm-atk",
      attackerCardId: "BT1-010",
      targetPermanentId: "perm-def",
      targetCardId: "BT1-020",
    });
  });

  it("remembers a declaration on the player with no target permanent", () => {
    expect(openAfter([DECLARE_ON_PLAYER])).toMatchObject({ targetPermanentId: null });
  });

  it("re-points an open attack at the blocker, dropping the declared target's identity", () => {
    const open = openAfter([DECLARE_ON_PLAYER, { kind: "blocked", blockerPermanentId: "perm-blocker" }]);
    expect(open).toMatchObject({ targetPermanentId: "perm-blocker" });
    expect(open?.targetCardId).toBeUndefined();
  });

  it("forgets the attack once anything closes it", () => {
    for (const closer of [
      COMBAT,
      { kind: "securityChecked", seat: 1, revealedCardId: "BT1-020", resolution: "battle" } as ServerEvent,
      { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 3 } as ServerEvent,
      { kind: "phaseChanged", phase: "Main", turnSeat: 0, turnCount: 3 } as ServerEvent,
    ]) {
      expect(openAfter([DECLARE_ON_PERMANENT, closer])).toBeNull();
    }
  });

  it("ignores a block with no attack open", () => {
    expect(openAfter([{ kind: "blocked", blockerPermanentId: "perm-blocker" }])).toBeNull();
  });
});

describe("buildFieldClashScene", () => {
  const cardIdOf = () => undefined;

  it("stages the battle a declaration on a permanent resolved into", () => {
    const scene = buildFieldClashScene({
      key: 1,
      open: openAfter([DECLARE_ON_PERMANENT]),
      event: COMBAT,
      viewerSeat: 0,
      cardIdOf,
    });
    expect(scene).toEqual({
      key: 1,
      attacker: { permanentId: "perm-atk", cardId: "BT1-010" },
      defender: { permanentId: "perm-def", cardId: "BT1-020" },
      loserPermanentIds: ["perm-def"],
      direction: "up",
    });
  });

  it("leans the opponent's attacker down the board instead", () => {
    const scene = buildFieldClashScene({
      key: 2,
      open: openAfter([{ ...DECLARE_ON_PERMANENT, seat: 1 }]),
      event: COMBAT,
      viewerSeat: 0,
      cardIdOf,
    });
    expect(scene?.direction).toBe("down");
  });

  it("stages a blocked player attack against the blocker, naming it from the board's memory", () => {
    const scene = buildFieldClashScene({
      key: 3,
      open: openAfter([DECLARE_ON_PLAYER, { kind: "blocked", blockerPermanentId: "perm-blocker" }]),
      event: { ...COMBAT, seat: 1, deletedPermanentIds: ["perm-blocker"] },
      viewerSeat: 0,
      cardIdOf: (permanentId) => (permanentId === "perm-blocker" ? "BT1-030" : undefined),
    });
    expect(scene).toMatchObject({
      defender: { permanentId: "perm-blocker", cardId: "BT1-030" },
      direction: "down",
    });
  });

  it("stages nothing for an unblocked player attack or an unknown one", () => {
    expect(
      buildFieldClashScene({ key: 4, open: openAfter([DECLARE_ON_PLAYER]), event: COMBAT, viewerSeat: 0, cardIdOf }),
    ).toBeNull();
    expect(buildFieldClashScene({ key: 5, open: null, event: COMBAT, viewerSeat: 0, cardIdOf })).toBeNull();
  });

  it("stages nothing when the resolution names a different attacker", () => {
    const scene = buildFieldClashScene({
      key: 6,
      open: openAfter([DECLARE_ON_PERMANENT]),
      event: { ...COMBAT, attackerPermanentId: "perm-other" },
      viewerSeat: 0,
      cardIdOf,
    });
    expect(scene).toBeNull();
  });

  it("keeps both losers of a tie", () => {
    const scene = buildFieldClashScene({
      key: 7,
      open: openAfter([DECLARE_ON_PERMANENT]),
      event: { ...COMBAT, deletedPermanentIds: ["perm-atk", "perm-def"] },
      viewerSeat: 0,
      cardIdOf,
    });
    expect(scene?.loserPermanentIds).toEqual(["perm-atk", "perm-def"]);
  });
});
