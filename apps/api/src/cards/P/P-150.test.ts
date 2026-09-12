import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-150.js";

describe("P-150 Exermon", () => {
  it("encodes both When Digivolving branches, including the exact-three overlap", () => {
    const effect = runtimeCompiledCard("P-150")!.effects[0]!;
    expect(effect.trigger).toBe("WhenDigivolving");
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          condition: expect.objectContaining({ kind: "securityAtLeast", value: 3 }),
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          condition: expect.objectContaining({
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
          }),
        }),
      ]),
    );
  });

  it("encodes the inherited once-per-turn DP-relative suspension", () => {
    const inherited = runtimeCompiledCard("P-150")!.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: expect.objectContaining({
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
                count: 1,
              }),
            },
          ],
        },
      ],
    });
  });

  it("suspends an opposing Digimon at the exact three-security boundary", async () => {
    const s = setupEngine(
      {
        0: {
          security: 3,
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "P-150", as: "exermon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const exermonId = s.inst("exermon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("exermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-150" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard?.instanceId).toBe(exermonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend from the security-at-least-three clause with only two security", async () => {
    const s = setupEngine(
      {
        0: {
          security: 2,
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "P-150", as: "exermon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const exermonId = s.inst("exermon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("exermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-150" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard?.instanceId).toBe(exermonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("restricts an opposing Digimon from unsuspending when security is three or fewer", async () => {
    const s = setupEngine(
      {
        0: {
          security: 2,
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "P-150", as: "exermon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const exermonId = s.inst("exermon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("exermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-150" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard?.instanceId).toBe(exermonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("suspends once per turn and re-arms after the next natural owner turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "host", dp: 5000, under: ["P-150"] }],
        hand: ["BT1-009"],
        deck: Array(20).fill("BT1-013"),
        security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "first", dp: 4000 }],
        deck: Array(20).fill("BT1-013"),
        security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
      },
    });
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
      () => s.perm("first").isSuspended && s.state.pendingDecision === undefined && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("first").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId, s.perm("first").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("first").isSuspended).toBe(false);
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
      () => s.perm("first").isSuspended && s.state.pendingDecision === undefined && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
