import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-009.js";
import "./EX1-048.js";
import "../ST1/ST1-12.js";
import "../BT1/BT1-072.js";

describe("EX1-009 WarGreymon", () => {
  it("has Blitz and deletes an opposing Blocker when attacking a player with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-009", as: "attacker" },
            { card: "ST1-12", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "blocker" },
            { card: "BT1-010", as: "nonBlocker" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blockerId = s.perm("blocker").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === blockerId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete a Blocker when the attack targets a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-009", as: "attacker" },
            { card: "ST1-12", as: "tamer" },
          ],
        },
        // Survive the 12000-DP attacker plus Tai's continuous +1000 DP.
        1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 14000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("requires a Tamer before deleting a Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-009", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes an inherited Blocker before the public blocker response (Q3198/Q3199)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-009", as: "attacker" },
            { card: "ST1-12", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-066", as: "inheritedBlocker", under: ["EX1-048"] },
            { card: "BT1-072", as: "printedBlocker" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("inheritedBlocker").permanentId, s.perm("inheritedBlocker").topCard.instanceId);
    const inheritedId = s.perm("inheritedBlocker").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === inheritedId));
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("printedBlocker").permanentId],
    });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("printedBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
  });

  it("allows a real Blitz attack after digivolving past zero memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", as: "base" },
            { card: "ST1-12", as: "tamer" },
          ],
          hand: [{ card: "EX1-009", as: "evo" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-009");
    expect(s.state.memory).toBeLessThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
