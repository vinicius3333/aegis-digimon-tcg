import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-003.js";

describe("EX1-003 Birdramon", () => {
  it("deletes only a 3000 DP-or-less Digimon when attacking a player", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-020", as: "attacker", under: ["EX1-003"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small", dp: 3000 },
            { card: "BT1-010", as: "large", dp: 4000 },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const smallId = s.perm("small").topCard.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === smallId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("large").permanentId);
  });

  it("does not delete a Digimon when the attack targets a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-020", as: "attacker", under: ["EX1-003"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes the eligible Blocker before the public blocker response (Q3190)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-020", as: "attacker", under: ["EX1-003"] }] },
        1: {
          battleArea: [
            { card: "ST18-07", as: "smallBlocker", dp: 3000 },
            { card: "BT1-072", as: "remainingBlocker" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("smallBlocker").permanentId, s.perm("smallBlocker").topCard.instanceId);
    const deletedId = s.perm("smallBlocker").topCard.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedId));
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("remainingBlocker").permanentId,
    ]);
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("remainingBlocker").permanentId],
    });
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("remainingBlocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("works after a legal public level-3-to-Birdramon evolution and higher host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "base" }],
          hand: [
            { card: "EX1-003", as: "evo" },
            { card: "BT1-020", as: "host" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-003");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-020");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length > 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
