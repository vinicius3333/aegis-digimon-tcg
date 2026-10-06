import { describe, expect, it } from "vitest";
import type { DecisionRequest, ServerEvent } from "@aegis/shared";
import { activeAttackArrow, createAttackArrowTracker, effectTargetArrow } from "./trackingArrow";
import { singleServerBatch } from "../net/serverBatches";

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

  it("drops the arrow of an attack that checks no security card (Discord 1555477213594259456)", () => {
    const events: ServerEvent[] = [attackSecurity, { kind: "attackEnded", seat: 0, attackerPermanentId: "att" }];
    expect(activeAttackArrow(events)).toBeNull();
  });

  it("re-aims the arrow onto the target a redirect switched to, without restarting it", () => {
    const declared = activeAttackArrow([attackSecurity]);
    const redirected = activeAttackArrow([attackSecurity, { ...attackDigimon, redirected: true }]);
    expect(redirected?.to).toEqual([{ kind: "permanent", permanentId: "def" }]);
    expect(redirected?.key).toBe(declared?.key);
  });

  it("puts an arrow up for a redirect that arrives with no attack open", () => {
    expect(activeAttackArrow([{ ...attackDigimon, redirected: true }])?.to).toEqual([
      { kind: "permanent", permanentId: "def" },
    ]);
  });

  it("keys each declaration apart so a second attack restarts the flashes", () => {
    const first = activeAttackArrow([attackDigimon])?.key;
    const second = activeAttackArrow([
      attackDigimon,
      { kind: "combatResolved", seat: 0, attackerPermanentId: "att", deletedPermanentIds: [] },
      { ...attackDigimon },
    ])?.key;
    expect(first).not.toBe(second);
  });
  it("keeps the declaration identity when older attacks leave the bounded log", () => {
    const first = { ...attackDigimon, seq: 1, batch: "first", stateVersion: 1 };
    const second = { ...attackDigimon, seq: 104, batch: "second", stateVersion: 2 };
    const events: ServerEvent[] = [
      first,
      { kind: "attackEnded", seat: 0, attackerPermanentId: "att" },
      ...Array.from({ length: 101 }, (): ServerEvent => ({ kind: "memoryChanged", from: 0, to: 1, reason: "padding" })),
      second,
    ];
    expect(activeAttackArrow(events)?.key).toBe(activeAttackArrow(events.slice(-100))?.key);
    expect(activeAttackArrow(events)?.key).not.toBe(activeAttackArrow([first])?.key);
  });
  it("retains a declaration and redirect after both leave the bounded log", () => {
    const tracker = createAttackArrowTracker();
    const first = { ...attackSecurity };
    const declared = tracker.read([first]);
    const padding = Array.from({ length: 101 }, (): ServerEvent => ({
      kind: "memoryChanged",
      from: 0,
      to: 1,
      reason: "padding",
    }));
    expect(tracker.read(padding.slice(-100))?.key).toBe(declared?.key);
    const redirect: ServerEvent = { ...attackDigimon, redirected: true };
    const redirected = tracker.read([...padding.slice(-99), redirect]);
    expect(redirected?.key).toBe(declared?.key);
    expect(redirected?.to).toEqual([{ kind: "permanent", permanentId: "def" }]);
    expect(tracker.read([{ kind: "attackEnded", seat: 0, attackerPermanentId: "att" }])).toBeNull();
  });
  it("gives raw fixture events and their fabricated batch copies the same identity", () => {
    const source: ServerEvent = { ...attackDigimon };
    const raw = activeAttackArrow([source]);
    const batch = singleServerBatch([source]);
    expect(activeAttackArrow(batch.events)?.key).toBe(raw?.key);
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

  it("draws a forced-attack arrow from the attacker to security", () => {
    const arrow = effectTargetArrow({
      decision: {
        decisionId: "forced-attack",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose the attack target for the forced attack.",
        options: { candidateInstanceIds: ["player", "opp-1"], selectionContext: "attackTarget" },
      },
      picks: ["player"],
      viewerSeat: 0,
      sourcePermanentId: "examon",
    });
    expect(arrow).toMatchObject({
      kind: "effect",
      from: { kind: "permanent", permanentId: "examon" },
      to: [{ kind: "security", seat: 1 }],
    });
  });

  it("does not draw an effect arrow from the effect source to a picked attacker", () => {
    expect(
      effectTargetArrow({
        decision: {
          ...targetDecision,
          options: { ...targetDecision.options, selectionContext: "attackSource" },
        },
        picks: ["opp-1"],
        viewerSeat: 0,
        sourcePermanentId: "alphamon",
      }),
    ).toBeNull();
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
