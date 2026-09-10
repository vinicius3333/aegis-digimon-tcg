import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-087.js";
import "../BT1/BT1-046.js";
import "../BT1/BT1-051.js";
import "./EX1-031.js";
import "./EX1-029.js";

describe("EX1-029 MagnaAngemon", () => {
  it("gets +4000 DP when attacking with 3 or more security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }], security: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { security: ["BT1-012", "BT1-013"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").currentDP === 11000);
    expect(s.perm("magna").currentDP).toBe(11000);
  });

  it("gains 1 memory from public security replacement even when the net count is unchanged (Q3213)", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: ["BT1-009", { card: "BT1-087", as: "yellowChoice" }],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    preferredSelection.push(s.inst("yellowChoice").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowChoice").instanceId) &&
        s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowChoice").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3); // 6 - BT1-087's play cost 4 + EX1-029's inherited memory 1
  });

  it("does not gain the attack bonus with fewer than three security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }], security: ["BT1-009", "BT1-010"] },
      1: { security: ["BT1-012", "BT1-013"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").isSuspended);
    expect(s.perm("magna").currentDP).toBe(7000);
  });

  it("keeps the attack bonus through the opponent turn and expires after it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        hand: ["BT1-009"],
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        security: ["BT1-012", "BT1-013"],
        hand: ["BT1-009"],
        deck: ["BT1-014", "BT1-009", "BT1-010"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").currentDP === 11000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("magna").currentDP).toBe(11000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("magna").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory twice when public security replacement repeats in one turn", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
          hand: [
            { card: "BT1-087", as: "firstTakeru" },
            { card: "BT1-087", as: "secondTakeru" },
          ],
          security: ["BT1-009", { card: "BT1-087", as: "firstChoice" }],
          deck: [
            { card: "BT1-045", as: "firstRecovery" },
            { card: "BT1-010", as: "secondRecovery" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    const firstChoiceId = s.inst("firstChoice").instanceId;
    const secondTakeruId = s.inst("secondTakeru").instanceId;
    const secondRecoveryId = s.inst("secondRecovery").instanceId;
    preferredSelection.push(firstChoiceId);
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === firstChoiceId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(3);

    const secondChoiceId = s.inst("firstRecovery").instanceId;
    preferredSelection.splice(0, preferredSelection.length, secondChoiceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.hand.some((card) => card.instanceId === secondTakeruId) &&
        s.state.players[0]!.security.some((card) => card.instanceId === secondRecoveryId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(-1); // second play costs 4; EX1-029 is once per turn
  });

  it("does not gain memory for an opponent's security addition during this player's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: [{ card: "BT1-087", as: "securityTaker" }, "BT1-046"],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(1); // opponent's Recovery +1 is public, but not ours
  });

  it("resets the inherited once-per-turn memory gain on the next own turn", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-029"] }],
          hand: [
            { card: "BT1-087", as: "firstTakeru" },
            { card: "EX1-031", as: "seraphimon" },
          ],
          security: ["BT1-009", { card: "BT1-087", as: "firstChoice" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-012"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    preferredSelection.push(s.inst("firstChoice").instanceId);
    preferredSelection.push(s.inst("firstChoice").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstChoice").instanceId));
    expect(s.state.memory).toBe(7);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("seraphimon").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "EX1-031" && s.state.players[0]!.security.length === 4);
    expect(s.state.memory).toBe(7); // evolve cost 4, then Recovery +1 and EX1-029's reset gain +1
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX1-029", "BT1-060"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the inherited effect only after a legal yellow level-4 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "source" }],
        hand: [
          { card: "BT1-051", as: "level4" },
          { card: "EX1-029", as: "magna" },
          { card: "EX1-031", as: "host" },
        ],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-012"] },
    });
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("level4").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT1-051");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("magna").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("source").topCard.cardId === "EX1-029");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-051"]);
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("host").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard.cardId === "EX1-031");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-051", "EX1-029"]);
    expect(s.state.players[0]!.security).toHaveLength(4); // EX1-031's Recovery +1
    expect(s.state.memory).toBe(2); // 10 - 2 - 3 - 4 + EX1-029's inherited +1
  });

  it("rejects an illegal non-yellow evolution and does not expose the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "source" }], hand: [{ card: "EX1-029", as: "magna" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("source").topCard.cardId).toBe("BT1-009");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
  });
});
