import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-043.js";
import "../index.js";

describe("BT16-043", () => {
  it("suspends an opponent and gains memory under the independent security conditions", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("grants inherited DP when the top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
    expect(digivolutionRequirementsFor("BT16-043")).toEqual([{ names: ["Pulsemon"], cost: 2, isAlternate: true }]);
  });

  it("activates both branches at exactly three security cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-043", as: "runner" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("runner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.state.memory === 1);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("uses only the matching security boundary on play", async () => {
    const high = setupEngine(
      {
        0: { hand: [{ card: "BT16-043", as: "runner" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    high.state.memory = 8;
    expect(high.engine.applyIntent(0, { type: "playCard", instanceId: high.inst("runner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => high.perm("opponent").isSuspended);
    expect(high.perm("opponent").isSuspended).toBe(true);
    expect(high.state.memory).toBe(4);

    const low = setupEngine(
      {
        0: { hand: [{ card: "BT16-043", as: "runner" }], security: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    low.state.memory = 8;
    expect(low.engine.applyIntent(0, { type: "playCard", instanceId: low.inst("runner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => low.state.memory === 5);
    expect(low.perm("opponent").isSuspended).toBe(false);
    expect(low.state.memory).toBe(5);
  });

  it("uses the Pulsemon alternate route and resolves both clauses on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-039", as: "base" }],
          hand: [{ card: "BT16-043", as: "runner" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("runner").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-043");

    expect(s.state.memory).toBe(3);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("applies the inherited bonus only when the host's top card has Pulsemon in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-044", as: "pulseHost", dp: 6000, under: ["BT16-043"] },
          { card: "BT16-048", as: "otherHost", dp: 14000, under: ["BT16-045", "BT16-043"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("pulseHost").currentDP).toBe(7000);
    expect(s.perm("otherHost").currentDP).toBe(14000);
  });
});
