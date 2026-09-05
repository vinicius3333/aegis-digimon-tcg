import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "../ST15/ST15-15.js";
import "./EX1-013.js";
import "./EX1-054.js";

describe("EX1-013 Veemon", () => {
  it("gains 1 memory when its host becomes unsuspended during your main phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-019", as: "host", suspended: true, under: ["EX1-013", "BT1-032"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.memory === 5);
    expect(s.state.memory).toBe(5);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-054", as: "host", under: ["EX1-013", "BT1-032"] }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-070", as: "opponent" }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
        security: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    const triggersBeforeOpponentTurn = s.events.filter(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-013",
    ).length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-013"),
    ).toHaveLength(triggersBeforeOpponentTurn);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger when an already-unsuspended Digimon is targeted (Q3203)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-019", as: "host", under: ["EX1-013", "BT1-032"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-013")).toBe(false);
  });

  it("fires only once per turn after two genuine unsuspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-019", as: "host", suspended: true, under: ["EX1-013", "BT1-032"] },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [
            { card: "ST15-15", as: "firstUnsuspender" },
            { card: "ST15-15", as: "secondUnsuspender" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstUnsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.memory === 7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    const memoryBeforeSecondUnsuspend = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondUnsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(memoryBeforeSecondUnsuspend - 4);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-013"),
    ).toHaveLength(1);
  });
});
