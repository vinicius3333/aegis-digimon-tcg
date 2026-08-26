import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-016.js";
describe("BT10-016 Jesmon (X Antibody)", () => {
  it("encodes Piercing, exact Jesmon evolution for 0, and the persistent played-Digimon watcher", () => {
    expect(compiled.effects[0]?.keywords).toEqual([expect.objectContaining({ keyword: "Piercing" })]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Jesmon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true }),
        expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }),
        expect.objectContaining({ kind: "GrantCanAttackUnsuspended", duration: "untilOpponentTurnEnd" }),
        expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", playerScoped: true }),
      ]),
    );
  });

  it("plays a Sistermon and applies only one +2000 DP bonus when both gates match (Q1944)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-016", as: "base" }],
          hand: [
            { card: "BT10-016", as: "evolving" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 13000 && observe(s.engine).canAttackUnsuspended(s.perm("base")));
    expect(s.perm("base").currentDP).toBe(13000);
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("sister").instanceId)?.currentDP,
    ).toBe(5000);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("base"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("does not digivolve onto another Jesmon (X Antibody) through its exact [Jesmon] requirement", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-016", as: "base" }],
          hand: [{ card: "BT10-016", as: "evolving" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    });

    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.instanceId).not.toBe(s.inst("evolving").instanceId);
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("evolving"));
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").currentDP).toBe(11_000);
  });

  it("does not treat Jesmon (X Antibody) as the exact Jesmon source for its bonus", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-016", as: "jesmonX", under: ["BT10-016"] }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jesmonX"));

    expect(s.perm("jesmonX").currentDP).toBe(11_000);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("jesmonX"))).toBe(false);
  });

  it("grants DP and unsuspended targets to current and later Digimon without bypassing summoning sickness (Q1945)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-016", as: "base" },
            { card: "BT10-008", as: "currentAlly" },
          ],
          hand: [
            { card: "BT10-016", as: "evolving" },
            { card: "BT10-008", as: "laterAlly" },
          ],
        },
        1: { battleArea: [{ card: "BT10-008", as: "unsuspendedOpponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    // Board-spec permanents are from a prior turn; the later effect-play remains fresh.
    s.state.turnCount += 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).canAttackUnsuspended(s.perm("currentAlly")) &&
        s.perm("currentAlly").attackablePermanentIds.includes(s.perm("unsuspendedOpponent").permanentId),
    );

    expect(s.perm("currentAlly").currentDP).toBe(4000);
    expect(s.perm("currentAlly").attackablePermanentIds).toContain(s.perm("unsuspendedOpponent").permanentId);

    // The resolved player-scoped effect persists even if Jesmon X leaves the battle area.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId])).toBe(1);
    await advance(s.engine).verb.playInstances([s.inst("laterAlly").instanceId]);
    const later = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("laterAlly").instanceId,
    )!;

    expect(later.currentDP).toBe(4000);
    expect(observe(s.engine).canAttackUnsuspended(later)).toBe(true);
    expect(later.attackablePermanentIds).not.toContain(s.perm("unsuspendedOpponent").permanentId);
  });
});
