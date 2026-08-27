import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-053.js";

describe("BT25-053 Aegiochusmon: Green", () => {
  it("suspends an opponent Digimon and grants the <=3-security bonus", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(13000);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("applies the unsuspend restriction to the chosen target even when it was already suspended (Q6329)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT25-046", as: "chosen", suspended: true },
            { card: "BT25-046", as: "other", suspended: true },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("chosen").permanentId, s.perm("other").permanentId]);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("keeps both entry timings and the inherited security-removal watcher", () => {
    const card = runtimeCompiledCard("BT25-053");
    expect(
      card?.effects.filter((effect) => effect.trigger === "Static").flatMap((effect) => effect.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Vortex" }),
        expect.objectContaining({ keyword: "Decode" }),
      ]),
    );
    expect(
      card?.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }],
    });
    expect(card?.digivolutionRequirement).toEqual([{ names: ["Aegiomon"], cost: 3, isAlternate: true }]);
  });

  it("uses the named Aegiomon evolution route and resolves its When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-033", as: "aegiomon" }],
          hand: [{ card: "BT25-053", as: "green" }],
        },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("green").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard?.cardId === "BT25-053" && s.perm("target").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("inherits an optional once-per-turn reaction only to removal from its controller's security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-054", as: "host", under: ["BT25-053"] }] },
        1: {
          battleArea: [
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-089", as: "secondTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("firstTamer").isSuspended).toBe(false);
    expect(s.perm("secondTamer").isSuspended).toBe(false);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("firstTamer").isSuspended).toBe(true);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("secondTamer").isSuspended).toBe(false);
  });
});
