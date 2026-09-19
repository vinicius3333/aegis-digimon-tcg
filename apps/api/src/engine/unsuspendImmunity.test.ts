import { EffectDuration, Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";

it("allows an effect Unsuspend during Main despite a next-unsuspend-phase-only restriction", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] },
  });
  await s.ready();
  s.state.phase = Phase.Main;

  await advance(s.engine).verb.restrict(
    s.perm("target").permanentId,
    "unsuspendDuringOwnUnsuspendPhase",
    EffectDuration.UntilNextUntap,
  );
  await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

  expect(s.perm("target").isSuspended).toBe(false);
});

it("enforces the phase-only lock during the target's own Active phase", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-011", as: "target", suspended: true }],
      deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
    },
  });
  await s.ready();
  s.state.phase = Phase.Active;
  s.state.turnSeat = 0;

  await advance(s.engine).verb.restrict(
    s.perm("target").permanentId,
    "unsuspendDuringOwnUnsuspendPhase",
    EffectDuration.UntilNextUntap,
  );
  await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

  expect(s.perm("target").isSuspended).toBe(true);
});

it("does not apply the own-phase lock during the opponent's Active phase", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] },
  });
  await s.ready();
  s.state.phase = Phase.Active;
  s.state.turnSeat = 1;

  await advance(s.engine).verb.restrict(
    s.perm("target").permanentId,
    "unsuspendDuringOwnUnsuspendPhase",
    EffectDuration.UntilNextUntap,
  );
  await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

  expect(s.perm("target").isSuspended).toBe(false);
});

it("suppresses an opposing Unsuspend lock while the target is immune to that effect", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-011", as: "target", suspended: true }],
      deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
    },
    1: { battleArea: [{ card: "BT1-009", as: "source" }] },
  });
  await s.ready();
  const targetId = s.perm("target").permanentId;

  // Install a general restriction from an opposing Digimon effect, then give the target
  // Digimon-effect immunity. The restriction remains recorded and resumes when immunity ends.
  advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
  try {
    await advance(s.engine).verb.restrict(targetId, "unsuspend", EffectDuration.Permanent);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
  await advance(s.engine).verb.restrict(targetId, "beAffected", EffectDuration.UntilOwnerTurnEnd, {
    fromSourceKind: ["Digimon"],
    byOpponentEffectsOnly: true,
  });
  expect(s.engine.continuous.hasRestriction(targetId, "unsuspend")).toBe(false);

  // The source is the target's own effect. Its immunity suppresses the stored opponent lock,
  // allowing this own effect to unsuspend it; it does not make an opponent effect affect it.
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.unsuspend([targetId]);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }

  expect(s.perm("target").isSuspended).toBe(false);

  // End the target's owner's turn: immunity expires, while the opponent's permanent lock
  // remains. The stored restriction must become effective again.
  await advance(s.engine).runTurn(0);
  expect(s.engine.continuous.hasRestriction(targetId, "unsuspend")).toBe(true);
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.suspend([targetId]);
    await advance(s.engine).verb.unsuspend([targetId]);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
  expect(s.perm("target").isSuspended).toBe(true);
});

it("does not suppress an opposing restriction from a source kind outside the immunity", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] } });
  await s.ready();
  const targetId = s.perm("target").permanentId;

  advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
  try {
    await advance(s.engine).verb.restrict(targetId, "unsuspend", EffectDuration.Permanent);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
  await advance(s.engine).verb.restrict(targetId, "beAffected", EffectDuration.Permanent, {
    fromSourceKind: ["Digimon"],
    byOpponentEffectsOnly: true,
  });

  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.unsuspend([targetId]);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }

  expect(s.perm("target").isSuspended).toBe(true);
});

it("does not let opponent-only immunity suppress the target's own restriction", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] } });
  await s.ready();
  const targetId = s.perm("target").permanentId;
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.restrict(targetId, "unsuspend", EffectDuration.Permanent);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
  await advance(s.engine).verb.restrict(targetId, "beAffected", EffectDuration.Permanent, {
    byOpponentEffectsOnly: true,
  });

  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.unsuspend([targetId]);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }

  expect(s.perm("target").isSuspended).toBe(true);
});

it("lets blanket immunity suppress a restriction from the same controller in the ledger", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] } });
  await s.ready();
  const targetId = s.perm("target").permanentId;
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.restrict(targetId, "unsuspend", EffectDuration.Permanent);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
  await advance(s.engine).verb.restrict(targetId, "beAffected", EffectDuration.Permanent);

  expect(s.engine.continuous.hasRestriction(targetId, "unsuspend")).toBe(false);
  expect(s.perm("target").isSuspended).toBe(true);
});
