import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-064.js";
describe("EX7-064 Shoto Kazama", () => {
  it("gains memory when the opponent has a Digimon", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("grants Piercing and Blocker through the suspend cost and plays from security", () => {
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Piercing" },
      cost: { kind: "suspend" },
    });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { sameTarget: true },
    });
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });

  it("gains memory only when the opponent has a Digimon at the start of Main", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "EX7-064", as: "shoto" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    withOpponent.state.memory = 0;
    await advance(withOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withOpponent.perm("shoto"));
    expect(withOpponent.state.memory).toBe(1);

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "EX7-064", as: "shoto" }] } });
    withoutOpponent.state.memory = 0;
    await advance(withoutOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withoutOpponent.perm("shoto"));
    expect(withoutOpponent.state.memory).toBe(0);
  });

  it("suspends itself, grants both keywords, and unsuspends a Vortex Warriors target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "EX7-034", as: "vortex", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("vortex"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("vortex"), "Blocker")).toBe(true);
    expect(s.perm("vortex").isSuspended).toBe(false);
  });

  it("allows a Vortex attack after Shoto's end-of-turn unsuspend (Q3868)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-064", as: "shoto" },
          { card: "EX7-034", as: "vortex", under: ["EX7-035"], suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    expect(s.perm("vortex").isSuspended).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("vortex"))).toBe(true);

    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("vortex").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      vortex: true,
    });
    expect(attackResult).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows Shoto's effect after a Vortex attack (Q3869)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "EX7-034", as: "vortex", under: ["EX7-035"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vortex").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        vortex: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("vortex").isSuspended).toBe(true);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("vortex"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("vortex"))).toBe(true);
  });

  it("does not unsuspend a non-Vortex target, and declining the optional effect leaves it unchanged", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    await advance(accepted.engine).fire(EffectTiming.EndOfYourTurn, accepted.perm("shoto"));
    expect(accepted.perm("ordinary").isSuspended).toBe(true);
    expect(observe(accepted.engine).hasPierce(accepted.perm("ordinary"))).toBe(true);
    expect(observe(accepted.engine).hasKeyword(accepted.perm("ordinary"), "Blocker")).toBe(true);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.EndOfYourTurn, declined.perm("shoto"));
    expect(declined.perm("shoto").isSuspended).toBe(false);
    expect(observe(declined.engine).hasKeyword(declined.perm("ordinary"), "Blocker")).toBe(false);
  });

  it("plays itself when revealed as a Security card", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX7-064", as: "shoto" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("shoto"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("shoto").instanceId),
    ).toBe(true);
  });
});
