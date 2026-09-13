import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT16/BT16-018.js";
import "../index.js";
import "./P-117.js";

describe("P-117 Veemon", () => {
  it("reduces a Your Turn digivolution into a Free Digimon by 1 when a Tamer is present", async () => {
    expect(getCardDefinition("P-117")).toMatchObject({ nameEn: "Veemon", kinds: ["Digimon"], level: 3 });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-117", as: "veemon" },
            { card: "P-124", as: "tamer" },
          ],
          hand: [
            { card: "BT16-018", as: "firstFree" },
            { card: "BT16-018", as: "secondFree" },
            { card: "BT16-018", as: "thirdFree" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("firstFree").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("veemon").topCard.instanceId === s.inst("firstFree").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("firstFree").instanceId);
    expect(s.state.memory).toBe(9);
    expect(s.perm("veemon").stack.some((card) => card.instanceId === s.inst("veemon").instanceId)).toBe(true);
    const primitives = (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, count: number) => Promise<unknown> } }
    ).primitives;
    await primitives.deDigivolve(s.perm("veemon").permanentId, 1);
    await s.ready();
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veemon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("secondFree").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("veemon").topCard.instanceId === s.inst("secondFree").instanceId &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("veemon").stack.some((card) => card.instanceId === s.inst("veemon").instanceId)).toBe(true);
    await primitives.deDigivolve(s.perm("veemon").permanentId, 1);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeThird = s.state.memory;
    expect(memoryBeforeThird).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("thirdFree").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("veemon").topCard.instanceId === s.inst("thirdFree").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(3);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 4, to: 3, reason: "digivolve" });
    expect(s.perm("veemon").stack.some((card) => card.instanceId === s.inst("veemon").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("draws from its two-color source through three public attacks and natural turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-018", as: "host", under: [{ card: "P-117", as: "source" }] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [
            { card: "BT1-009", as: "drawA" },
            { card: "BT1-009", as: "drawB" },
            { card: "BT1-009", as: "normalB" },
            { card: "BT1-009", as: "drawC" },
            ...Array.from({ length: 16 }, () => "BT1-009"),
          ],
        },
        1: {
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-028", "BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawA").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawA").instanceId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawB").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalB").instanceId)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawC").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawC").instanceId)).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
