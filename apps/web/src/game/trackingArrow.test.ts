import { describe, expect, it } from "vitest";
import type { DecisionRequest, ServerEvent } from "@aegis/shared";
import { activeAttackArrow, effectTargetArrow } from "./trackingArrow";

const attackSecurity: ServerEvent = {
  kind: "attackDeclared",
  seat: 0,
  attackerPermanentId: "att",
  attackerCardId: "ST1-07",
  target: { kind: "player" },
};

const attackDigimon: ServerEvent = {
  kind: "attackDeclared",
  seat: 0,
  attackerPermanentId: "att",
  attackerCardId: "ST1-07",
  target: { kind: "permanent", permanentId: "def" },
};

describe("activeAttackArrow", () => {
  it("draws nothing before an attack is declared", () => {
    expect(activeAttackArrow([{ kind: "matchStarted", firstSeat: 0 }])).toBeNull();
  });

  it("points a player attack at the other seat's security", () => {
    expect(activeAttackArrow([attackSecurity])).toMatchObject({
      kind: "attack",
      from: { kind: "permanent", permanentId: "att" },
      to: [{ kind: "security", seat: 1 }],
    });
  });

  it("points a Digimon attack at the target permanent", () => {
    expect(activeAttackArrow([attackDigimon])?.to).toEqual([{ kind: "permanent", permanentId: "def" }]);
  });

  it("moves the point to the blocker", () => {
    const arrow = activeAttackArrow([attackSecurity, { kind: "blocked", blockerPermanentId: "blk" }]);
    expect(arrow?.to).toEqual([{ kind: "permanent", permanentId: "blk" }]);
  });

  it("drops the arrow once the combat resolves", () => {
    const events: ServerEvent[] = [
      attackDigimon,
      { kind: "combatResolved", seat: 0, attackerPermanentId: "att", deletedPermanentIds: [] },
    ];
    expect(activeAttackArrow(events)).toBeNull();
  });

  it("drops the arrow once security is checked", () => {
    const events: ServerEvent[] = [
      attackSecurity,
      { kind: "securityChecked", seat: 1, revealedCardId: "ST1-03", resolution: "trashed" },
    ];
    expect(activeAttackArrow(events)).toBeNull();
  });

  it("keys each declaration apart so a second attack restarts the flashes", () => {
    const first = activeAttackArrow([attackDigimon])?.key;
    const second = activeAttackArrow([
      attackDigimon,
      { kind: "combatResolved", seat: 0, attackerPermanentId: "att", deletedPermanentIds: [] },
      attackDigimon,
    ])?.key;
    expect(first).not.toBe(second);
  });
});

const targetDecision: DecisionRequest = {
  decisionId: "d1",
  seat: 0,
  kind: "chooseTargets",
  promptText: "Choose targets",
  options: { candidateInstanceIds: ["opp-1", "opp-2"], targetFate: "delete" },
};

describe("effectTargetArrow", () => {
  it("draws from the source permanent to the picked targets", () => {
    const arrow = effectTargetArrow({
      decision: targetDecision,
      picks: ["opp-1"],
      viewerSeat: 0,
      sourcePermanentId: "src",
    });
    expect(arrow).toMatchObject({
      kind: "effect",
      from: { kind: "permanent", permanentId: "src" },
      to: [{ kind: "permanent", permanentId: "opp-1" }],
    });
  });

  it("draws nothing before a target is picked", () => {
    expect(
      effectTargetArrow({ decision: targetDecision, picks: [], viewerSeat: 0, sourcePermanentId: "src" }),
    ).toBeNull();
  });

  it("draws nothing when the source is not on the board", () => {
    expect(
      effectTargetArrow({ decision: targetDecision, picks: ["opp-1"], viewerSeat: 0, sourcePermanentId: undefined }),
    ).toBeNull();
  });

  it("draws nothing for the seat that was not asked", () => {
    expect(
      effectTargetArrow({ decision: targetDecision, picks: ["opp-1"], viewerSeat: 1, sourcePermanentId: "src" }),
    ).toBeNull();
  });

  it("ignores a pick the server never offered", () => {
    expect(
      effectTargetArrow({ decision: targetDecision, picks: ["ghost"], viewerSeat: 0, sourcePermanentId: "src" }),
    ).toBeNull();
  });
});
