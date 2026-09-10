import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-070.js";
import "./EX1-039.js";

describe("EX1-039 Lillymon", () => {
  it("grants Security Attack +1 from a public suspension and performs two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-039"] }],
          hand: [{ card: "BT1-070", as: "suspender" }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("opponent").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("triggers only once per turn and expires when the public turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-039"] }],
          hand: [
            { card: "BT1-070", as: "firstSuspender" },
            { card: "BT1-070", as: "secondSuspender" },
            { card: "BT1-070", as: "thirdSuspender" },
          ],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "opponentOne" },
            { card: "BT1-070", as: "opponentTwo" },
            { card: "BT1-070", as: "opponentThree" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentOne").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("opponentOne").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    preferred.splice(0, preferred.length, s.perm("opponentTwo").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentTwo").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    preferred.splice(0, preferred.length, s.perm("opponentThree").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("opponentThree").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger from an opponent-turn suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-042", as: "host", under: ["EX1-039"] },
            { card: "BT1-070", as: "target" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
          hand: [{ card: "BT1-070", as: "suspender" }],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
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
    // "controller: opponent" is relative to the player who plays the suspender, and
    // `autoSelectCards` lands on the first eligible target — player0's host — not "target".
    await settle(() => s.perm("host").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("newly-evolved-inherited-watcher-registration: triggers after legal evolution in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-039", as: "source" }],
          hand: [
            { card: "EX1-042", as: "evo" },
            { card: "BT1-070", as: "suspender" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-042");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-039"]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("source"), "SecurityAttack")).toBe(1);
  });

  it("accepts legal green evolution and rejects a red source", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-070", as: "source" }],
          hand: [
            { card: "EX1-039", as: "evo" },
            { card: "BT1-070", as: "suspender" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
          deck: ["BT1-009", "BT1-012", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    legal.state.memory = 10;
    await legal.ready();
    const permanentId = legal.perm("source").permanentId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: legal.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("source").topCard.cardId === "EX1-039");
    expect(legal.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-070"]);
    expect(legal.state.memory).toBe(7);
    expect(legal.state.players[0]!.hand.some(({ instanceId }) => instanceId === legal.inst("evo").instanceId)).toBe(
      false,
    );

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "EX1-039", as: "evo" }] },
    });
    illegal.state.memory = 10;
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
    expect(illegal.state.memory).toBe(10);
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-039"]);
  });
});
