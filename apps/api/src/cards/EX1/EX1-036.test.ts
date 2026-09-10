import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-067.js";
import "../BT1/BT1-070.js";
import "./EX1-036.js";
import "./EX1-039.js";

describe("EX1-036 Togemon", () => {
  it("gives its host +2000 DP when a public opposing suspension resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "host", under: ["EX1-036"], dp: 3000 }],
          hand: [{ card: "BT1-070", as: "suspender" }],
        },
        1: { battleArea: [{ card: "BT1-070", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.perm("host").currentDP === 5000);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("ignores own suspension, triggers once per turn, expires, and re-arms next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-067", as: "host", under: ["EX1-036"], dp: 3000 },
            { card: "BT1-070", as: "ownTarget" },
          ],
          hand: [
            { card: "BT1-070", as: "firstSuspender" },
            { card: "BT1-070", as: "secondSuspender" },
            { card: "BT1-070", as: "thirdSuspender" },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "opponentOne" },
            { card: "BT1-070", as: "opponentTwo" },
            { card: "BT1-070", as: "opponentThree" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentOne").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ownTarget").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownTarget").isSuspended);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentOne").isSuspended && s.perm("host").currentDP === 5000);
    expect(s.perm("host").currentDP).toBe(5000);

    preferred.splice(0, preferred.length, s.perm("opponentTwo").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentTwo").isSuspended);
    expect(s.perm("host").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    preferred.splice(0, preferred.length, s.perm("opponentThree").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentThree").isSuspended && s.perm("host").currentDP === 5000);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger on an opponent-turn suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "host", under: ["EX1-036"], dp: 3000 }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponentTarget" }],
          hand: [{ card: "BT1-070", as: "suspender" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    // "controller: opponent" is relative to the player who plays the suspender, so player1's
    // own suspend card targets player0's host, not player1's own opponentTarget.
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the inherited effect after legal evolution and rejects a non-green source", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "host" }],
          hand: [
            { card: "EX1-036", as: "evo" },
            { card: "EX1-039", as: "hostEvo" },
            { card: "BT1-070", as: "suspender" },
          ],
        },
        1: { battleArea: [{ card: "BT1-070", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    legal.state.memory = 10;
    await legal.ready();
    const permanentId = legal.perm("host").permanentId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: legal.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("host").topCard.cardId === "EX1-036");
    expect(legal.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-067"]);
    expect(legal.state.memory).toBe(8);
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: legal.inst("hostEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("host").topCard.cardId === "EX1-039");
    expect(legal.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-067", "EX1-036"]);
    expect(legal.state.memory).toBe(5);
    expect(legal.engine.applyIntent(0, { type: "playCard", instanceId: legal.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => legal.perm("opponent").isSuspended && legal.perm("host").currentDP === 9000);
    expect(legal.perm("host").currentDP).toBe(9000);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "EX1-036", as: "evo" }] },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redSource").permanentId,
        instanceId: illegal.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.perm("redSource").topCard.cardId).toBe("BT1-009");
    expect(illegal.perm("redSource").stack).toHaveLength(0);
    expect(illegal.state.memory).toBe(5);
  });
});
