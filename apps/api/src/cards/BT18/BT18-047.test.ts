import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-047.js";

describe("BT18-047 Arbormon", () => {
  it("suspends the exact opposing target after paying with a green Digimon", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Suspend", optional: true, abortOnDecline: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Suspend", optional: true, abortOnDecline: true }] },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Vegetation"] }] },
      { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-047", as: "arbormon" }], battleArea: [{ card: "BT18-045", as: "greenCost" }] },
        1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("greenCost").topCard!.instanceId, s.perm("opponentTarget").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arbormon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.state.players[0]!.battleArea[1]!);

    expect(s.perm("greenCost").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does nothing when the optional suspension cost is declined", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT18-047", as: "arbormon" }], battleArea: [{ card: "BT18-045", as: "greenCost" }] },
      1: { battleArea: [{ card: "BT1-087", as: "opponentTamer" }] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arbormon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("greenCost").isSuspended).toBe(false);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("uses the zero-cost Petaldramon evolution and resolves the same paid effect", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-050", as: "petaldramon" },
            { card: "BT18-045", as: "greenCost" },
          ],
          hand: [{ card: "BT18-047", as: "arbormon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-087", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("greenCost").topCard!.instanceId, s.perm("opponentTamer").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("petaldramon").permanentId,
        instanceId: s.inst("arbormon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("petaldramon").topCard?.cardId === "BT18-047");
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("petaldramon"));

    expect(s.state.memory).toBe(5);
    expect(s.perm("petaldramon").stack.at(-1)?.cardId).toBe("BT18-050");
    expect(s.perm("greenCost").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants Vegetation to itself", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-047", as: "arbormon" }] } });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("arbormon"), "Vegetation")).toBe(true);
    assertNoLoudGap(s);
  });

  it("suspends only one opposing Digimon on the inherited host's first attack each turn", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-047"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "firstTarget" },
            { card: "BT1-030", as: "secondTarget" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("firstTarget").topCard!.instanceId, s.perm("secondTarget").topCard!.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("secondTarget").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
