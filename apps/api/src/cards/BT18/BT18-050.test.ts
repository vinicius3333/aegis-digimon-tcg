import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-050.js";

describe("BT18-050 Petaldramon", () => {
  it("unsuspends the exact qualifying level-4 Vegetation Digimon on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Unsuspend", optional: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend", optional: true }] },
      { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          battleArea: [{ card: "BT18-047", as: "vegetation", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("vegetation").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    await settle(() => !s.perm("vegetation").isSuspended);

    expect(s.perm("vegetation").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("rejects a level-5 Vegetation Digimon and an opposing qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          battleArea: [{ card: "BT1-078", as: "level5", suspended: true }],
        },
        1: { battleArea: [{ card: "BT18-047", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("level5").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from Arbormon for 1 and unsuspends a qualifying Plant", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-047", as: "arbormon", suspended: true }],
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("arbormon").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("arbormon").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("arbormon").topCard?.cardId === "BT18-050");
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arbormon"));

    expect(s.state.memory).toBe(4);
    expect(s.perm("arbormon").stack.at(-1)?.cardId).toBe("BT18-047");
    expect(s.perm("arbormon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("suspends only one opposing Digimon on its inherited host's first attack", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-050"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("first").topCard!.instanceId, s.perm("second").topCard!.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("second").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
