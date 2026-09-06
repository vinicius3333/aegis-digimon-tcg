import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-072.js";
import "../index.js";
describe("BT21-072 Arresterdramon Superior Mode", () => {
  it("has Raid/Piercing, optional unsuspended attack, stack scaling, and inherited DP", () => {
    expect(compiled.effects.filter((e) => e.keywords?.length)).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "Attack", withoutSuspending: true })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            scaling: expect.objectContaining({ unit: "digivolutionCards" }),
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
      }),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Save"], cost: 3, isAlternate: true },
      { traits: ["Hero"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gets +1000 DP for each digivolution card and exposes Raid and Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-072",
            as: "superior",
            under: [
              { card: "BT1-009", as: "sourceA" },
              { card: "BT1-010", as: "sourceB" },
            ],
          },
        ],
      },
    });
    await s.ready();

    expect(s.perm("superior").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("superior"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("superior"))).toBe(true);
  });

  it("Q4580 attacks while already suspended without suspending again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-066", as: "base", suspended: true }],
          hand: [{ card: "BT21-072", as: "superior" }],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("superior").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("declining the optional evolution attack leaves security untouched", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-072", as: "superior" }] },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("superior"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("superior").isSuspended).toBe(false);
  });

  it("gives its evolution host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-075", as: "host", under: [{ card: "BT21-072", as: "source" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it.each([
    ["Save-text", "BT21-066", 0],
    ["Hero", "BT21-013", 1],
  ] as const)("uses the %s alternate evolution route for 3", async (_label, base, requirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT21-072", as: "superior" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("superior").instanceId,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("superior").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("proves inherited +2000 DP on a legal Lv4-to-Lv5 evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-066", as: "base" }], hand: [{ card: "BT21-072", as: "superior" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("superior").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-072");
    expect(s.perm("base").currentDP).toBe(13000);
  });
});
