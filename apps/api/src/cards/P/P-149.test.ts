import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-149.js";

describe("P-149 Minomon", () => {
  it("encodes the inherited once-per-turn hand-costed deletion", () => {
    const compiled = runtimeCompiledCard("P-149")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Delete",
              optional: true,
              abortOnDecline: true,
              target: expect.objectContaining({
                filter: { controller: "opponent", kind: ["Digimon"], levels: [3] },
                count: 1,
              }),
              condition: expect.objectContaining({ kind: "selfColorCount", value: 2 }),
              cost: expect.objectContaining({
                kind: "trash",
                target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("re-arms the inherited deletion on the next natural owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-017", as: "host", under: ["P-149"] }],
          hand: [{ card: "ST1-16", as: "costOne" }, { card: "ST1-16", as: "costTwo" }, "BT1-009"],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
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
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("costOne").instanceId);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId)).toBe(true);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("costTwo").instanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("costTwo").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not pay or delete when the host has only one color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "host", under: ["P-149"] }],
          hand: [{ card: "ST1-16", as: "cost" }, "BT1-009"],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
  });
});
