import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-048.js";

describe("BT15-048", () => {
  it("restricts unsuspension and conditionally suspends an opposing Digimon when Togemon/X Antibody is in stack", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Suspend",
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["Togemon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });
  it("gains +1000 DP per suspended opposing Digimon as an inherited effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "cards" } }],
    }));

  it("restricts an opposing Digimon and suspends one when X Antibody is in the evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-045", as: "base" }],
          hand: [{ card: "BT15-048", as: "togemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("togemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-048");

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-045"]);
  });

  it("does not suspend without the Togemon/X Antibody stack condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-065", as: "base" }],
          hand: [{ card: "BT15-048", as: "togemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("togemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-048");

    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("counts only suspended opposing Digimon for its inherited DP boost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-078", as: "host", dp: 5000, under: ["BT15-048"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", suspended: true },
          { card: "BT1-010", suspended: true },
          { card: "BT1-088", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });
});
