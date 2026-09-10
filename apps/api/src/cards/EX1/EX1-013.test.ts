import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-032.js";
import "../BT1/BT1-036.js";
import "../BT1/BT1-085.js";
import "../ST15/ST15-15.js";
import "./EX1-013.js";
import "./EX1-054.js";
import "./EX1-019.js";

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
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-070", as: "opponent" }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
        security: ["BT1-009", "BT1-009"],
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
        1: { security: ["BT1-009", "BT1-009"] },
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
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
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

  it("resets its inherited once-per-turn limit on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-019", as: "host", under: ["EX1-013", "BT1-032"] },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [{ card: "BT1-036", as: "firstUnsuspender" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.filter((event) => event.kind === "securityChecked").length === 1 && s.perm("host").isSuspended,
    );
    const memoryBeforeFirstUnsuspend = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstUnsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(memoryBeforeFirstUnsuspend - 5);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.filter((event) => event.kind === "securityChecked").length === 2 && s.perm("host").isSuspended,
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    // Tai establishes 3 memory, then the next-turn automatic unsuspend proves
    // EX1-013 reset and resolves for +1 before Main opens.
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps EX1-013 as an inherited source through legal public evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "egg" },
        hand: [
          { card: "EX1-013", as: "veemon" },
          { card: "BT1-032", as: "champion" },
          { card: "EX1-019", as: "paildramon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const permanentId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-013");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-003"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("champion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT1-032");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").isSuspended && s.events.some((event) => event.kind === "securityChecked"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-019" && !s.perm("egg").isSuspended);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-003", "EX1-013", "BT1-032"]);
    expect(s.state.memory).toBe(1);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-013")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
