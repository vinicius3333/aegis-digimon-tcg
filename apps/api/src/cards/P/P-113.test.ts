import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-113.js";

describe("P-113 RustTyrannomon", () => {
  it("suspends every opposing Digimon at or below its DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-060", as: "base" }], hand: [{ card: "P-113", as: "rust" }], deck: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "BT1-025", dp: 11000, as: "small" },
            { card: "BT1-025", dp: 13000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rust").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("small").isSuspended);
    expect(s.perm("small").isSuspended).toBe(true);
    expect(s.perm("large").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Blast Digivolves from hand during a real Counter Timing without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-024", as: "base" }],
          hand: [{ card: "P-113", as: "rust" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("rust").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "P-113");
    expect(s.perm("base").topCard.cardId).toBe("P-113");
    expect(s.state.memory).toBe(0);
  });

  it("encodes the Q4219 battle-deletion watcher and once-per-turn security trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-113", as: "rust" },
          { card: "ST18-08", as: "attackerOne" },
          { card: "ST18-08", as: "attackerTwo" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "targetOne", suspended: true },
          { card: "BT1-009", as: "targetTwo", suspended: true },
        ],
        security: ["BT1-001", "BT1-001"],
      },
    });
    const targetOnePermanentId = s.perm("targetOne").permanentId;
    const targetTwoPermanentId = s.perm("targetTwo").permanentId;
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "permanent", permanentId: targetOnePermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetOnePermanentId));
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "permanent", permanentId: targetTwoPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetTwoPermanentId));
    // [Once Per Turn] prevents the second battle deletion from trashing the next
    // security card, even though it is caused by a different attacker.
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not trigger when the opponent deletes your other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-113", as: "rust" },
            { card: "BT1-009", as: "victim", dp: 1000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
