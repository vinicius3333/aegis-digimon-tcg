import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-004.js";

describe("EX10-004 Cupimon compiled contract", () => {
  it("models the inherited Lucemon breeding move effect and shared hand-trash cost", () => {
    const effect = compiled.effects?.[0];
    const move = effect?.actions?.[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(move).toMatchObject({
      kind: "SubTrigger",
      event: "whenMovedFromBreeding",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
    });
    expect(irNode(move).actions).toEqual([
      expect.objectContaining({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: expect.objectContaining({ kind: "trash" }),
      }),
      expect.objectContaining({ kind: "GainMemory", amount: 1 }),
    ]);
    expect(irNode(move).actions?.[1]?.condition).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays the hand-trash cost after a Lucemon stack moves from breeding, then draws and gains 1 memory", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [
            { card: "BT1-009", as: "discarded" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === memoryBefore + 1 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("lucemon").inBreeding).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.pendingDecision).toBeUndefined();

    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("lucemon").permanentId,
    });
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("does not trigger for a non-Lucemon breeding stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "nonLucemon", under: ["EX10-004"] },
          hand: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("nonLucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("keeps the hand and grants nothing when the cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: ["EX10-004"] },
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("still gains the memory when the paid draw finds an empty deck", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [{ card: "BT1-009", as: "discarded" }],
          deck: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("does nothing with an empty hand: the by-cost must be payable before the payload", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [],
          deck: [{ card: "BT1-010", as: "top" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("matches [Lucemon] as a substring of the name: Lucemon: Chaos Mode triggers it", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT7-111", as: "chaosMode", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [{ card: "BT1-009", as: "discarded" }, "BT1-011"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("chaosMode").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("discarded").instanceId]);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("watches ANY of your Lucemon: a battle-area source reacts to a different stack's move", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          breeding: { card: "BT4-115", as: "lucemon" },
          hand: [{ card: "BT1-009", as: "discarded" }, "BT1-011"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("discarded").instanceId]);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("cupimon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("fires once per source: two Cupimon in the same stack each grant a draw and a memory", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "BT4-115",
            as: "lucemon",
            under: [
              { card: "EX10-004", as: "cupimonA" },
              { card: "EX10-004", as: "cupimonB" },
            ],
          },
          hand: ["BT1-009", "BT1-011"],
          deck: [
            { card: "BT1-010", as: "drawnA" },
            { card: "BT1-012", as: "drawnB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 2);

    expect(s.state.memory).toBe(memoryBefore + 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot move a lone Cupimon out of breeding, so nothing triggers", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-004", as: "cupimon" },
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("cupimon").permanentId })).toEqual({
      ok: false,
      reason: "not-movable",
    });
    await settle(() => false, 60);

    expect(s.state.players[0]!.breeding).toBeDefined();
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("grants nothing when the OPPONENT moves a Lucemon out of breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
        1: {
          breeding: { card: "BT4-115", as: "theirLucemon" },
          hand: ["BT1-011"],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("theirLucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
  });
  it("refuses the second grant in the same turn: two Lucemon leave breeding through public intents", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] },
            { card: "P-123", as: "ukkomon" },
          ],
          breeding: { card: "EX10-013", as: "lucemonA" },
          eggDeck: [{ card: "BT1-006", as: "hatched" }],
          hand: [
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-012", as: "fodder2" },
            { card: "EX10-013", as: "lucemonB" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn1" },
            { card: "BT1-014", as: "drawn2" },
            { card: "BT1-009", as: "drawn3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("fodder1").instanceId, s.inst("fodder2").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemonA").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("hatched").instanceId &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn1").instanceId),
    );
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    const memoryAfterFirst = s.state.memory;
    expect(memoryAfterFirst).toBeGreaterThan(memoryBefore);
    const handAfterFirst = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    s.state.phase = Phase.Main;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("lucemonB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.breeding === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonB").instanceId),
    );
    await settle(() => false, 30);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonB").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn3").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [...handAfterFirst.filter((id) => id !== s.inst("lucemonB").instanceId), s.inst("drawn2").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets on the next own turn: a move on turn 1 and a move on turn 3 both grant", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          breeding: { card: "EX10-013", as: "lucemonT1" },
          eggDeck: [{ card: "BT1-006", as: "hatched" }],
          hand: [
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-012", as: "fodder2" },
            { card: "EX10-013", as: "lucemonT3" },
          ],
          deck: ["BT1-010", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-010"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-010"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("fodder1").instanceId, s.inst("fodder2").instanceId);

    const loop = s.engine.startTurnLoop();
    const p0 = s.state.players[0]!;

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemonT1").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => p0.trash.length === 1);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("fodder1").instanceId)).toBe(false);

    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    expect(p0.trash).toHaveLength(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => p0.breeding?.topCard?.instanceId === s.inst("hatched").instanceId);
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);

    const handBeforeSecond = p0.hand.length;
    const deckBeforeSecond = p0.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: p0.breeding!.permanentId,
        instanceId: s.inst("lucemonT3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 2);
    await settle(() => false, 30);

    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonT3").instanceId)).toBe(true);
    expect(p0.trash.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(true);
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("lucemonT3").instanceId)).toBe(false);
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(false);
    expect(p0.deck).toHaveLength(deckBeforeSecond - 2);
    expect(p0.hand).toHaveLength(handBeforeSecond);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
