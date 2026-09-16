import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle as settleEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

async function settle(maxTicks = 50): Promise<void> {
  for (let i = 0; i < maxTicks; i++) await Promise.resolve();
}

function setupGomamonEss(): EngineSetup {
  return setupEngine({
    0: {
      battleArea: [{ card: "BT1-036", as: "hostSeat0", under: [{ card: "P-004", as: "gomamon" }] }],
    },
    1: {
      battleArea: [{ card: "BT1-036", as: "oppPerm", under: [{ card: "P-003", as: "oppStackCard" }] }],
    },
  });
}

describe("A3 P-004 — whenDigivolutionTrashed consumer: +1 memory when YOU trash an opponent's digivolution card", () => {
  it("proves the owner-turn once-per-turn gate through public play and a natural reset", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-004", as: "host", under: [] }],
          hand: [
            { card: "BT1-036", as: "evolution" },
            { card: "P-003", as: "first" },
            { card: "P-003", as: "second" },
            { card: "P-003", as: "third" },
            "BT1-009",
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            {
              card: "BT1-040",
              as: "target",
              under: [
                { card: "BT1-003", as: "targetSource1" },
                { card: "P-003", as: "targetSource2" },
                { card: "BT1-036", as: "targetSource3" },
              ],
            },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const gomamonInstanceId = s.perm("host").topCard.instanceId;
    const targetSourceInstanceIds = s.perm("target").stack.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("host").topCard.cardId === "BT1-036" && s.state.pendingDecision === undefined);
    expect(s.perm("host").topCard.cardId).toBe("BT1-036");
    expect(s.perm("host").stack.some((card) => card.instanceId === gomamonInstanceId)).toBe(true);
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settleEngine(
      () =>
        s.perm("target").stack.length === 2 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === targetSourceInstanceIds[0]) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(5);
    expect(s.perm("target").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settleEngine(
      () =>
        s.perm("target").stack.length === 1 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === targetSourceInstanceIds[1]) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(1);
    expect(s.perm("target").stack).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settleEngine(
      () =>
        s.perm("target").stack.length === 0 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === targetSourceInstanceIds[2]) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("your effect trashing an opponent Digimon's digivolution card gains 1 memory", async () => {
    const s = setupGomamonEss();
    const oppPerm = s.perm("oppPerm");
    const oppStackCard = s.inst("oppStackCard");

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    await primitivesOf(s).trashDigivolutionCards(oppPerm.permanentId, [oppStackCard.instanceId], {
      byEffectSeat: 0,
    });
    await settle();

    expect(oppPerm.stack.length).toBe(0);
    expect(s.state.memory).not.toBe(memoryBefore);
    expect(Math.abs(s.state.memory - memoryBefore)).toBe(1);
  });

  it("a return-to-hand bounce that clears digivolution cards gains NO memory (Q4113)", async () => {
    const s = setupGomamonEss();
    const oppPerm = s.perm("oppPerm");

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    await primitivesOf(s).returnToHand([oppPerm.topCard!.instanceId]);
    await settle();

    expect(s.state.memory).toBe(memoryBefore);
  });

  it("the OPPONENT trashing their own digivolution card gains YOU no memory (by-your-effect gate)", async () => {
    const s = setupGomamonEss();
    const oppPerm = s.perm("oppPerm");
    const oppStackCard = s.inst("oppStackCard");

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    await primitivesOf(s).trashDigivolutionCards(oppPerm.permanentId, [oppStackCard.instanceId], {
      byEffectSeat: 1,
    });
    await settle();

    expect(oppPerm.stack.length).toBe(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("gains memory only once per turn when two opponent sources are trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-036", under: ["P-004"], as: "hostSeat0" }] },
      1: {
        battleArea: [
          { card: "BT1-036", under: ["P-003"], as: "first" },
          { card: "BT1-036", under: ["P-003"], as: "second" },
        ],
      },
    });
    const primitives = primitivesOf(s);
    const memoryBefore = s.state.memory;
    await primitives.trashDigivolutionCards(s.perm("first").permanentId, [s.perm("first").stack[0]!.instanceId], {
      byEffectSeat: 0,
    });
    await primitives.trashDigivolutionCards(s.perm("second").permanentId, [s.perm("second").stack[0]!.instanceId], {
      byEffectSeat: 0,
    });
    await settle();
    expect(s.state.memory - memoryBefore).toBe(1);
  });

  it("does not gain memory from the opponent's turn", async () => {
    const s = setupGomamonEss();
    s.state.turnSeat = 1;
    const memoryBefore = s.state.memory;
    await primitivesOf(s).trashDigivolutionCards(
      s.perm("oppPerm").permanentId,
      [s.perm("oppPerm").stack[0]!.instanceId],
      {
        byEffectSeat: 0,
      },
    );
    await settle();
    expect(s.state.memory).toBe(memoryBefore);
  });
});
