import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-012.js";
import "../index.js";
import {
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
} from "../../engine/effects/interpreter/registration/reducers.js";

describe("EX5-012 Flaremon", () => {
  it("reduces play and digivolution cost by two only when a qualifying stacked Digimon exists", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 2,
            condition: { kind: "youHave", filter: { digivolutionCardsAtLeast: 3 } },
          },
        ],
      },
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 }],
      },
    ]);
  });
  it("registers only self-scoped play and digivolve-into reductions for the pay-time collectors", () => {
    expect(wouldBePlayedSelfReducersFor("EX5-012")).toContainEqual(expect.objectContaining({ amount: 2 }));
    expect(wouldDigivolveSelfReducersFor("EX5-012")).toContainEqual(
      expect.objectContaining({ amount: 2, condition: expect.objectContaining({ kind: "youHave" }) }),
    );
  });
  it("deletes an opposing Digimon at 5000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
  });
  it("grants itself 2000 DP during its controller's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("reduces play cost by two only with a qualifying three-card Light Fang stack", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX5-008", as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "EX5-012", as: "flaremon" }],
      },
    });
    await eligible.ready();
    eligible.state.memory = 7;
    expect(
      eligible.engine.applyIntent(0, { type: "playCard", instanceId: eligible.inst("flaremon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => eligible.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-012"), 500);
    expect(eligible.state.memory).toBe(2);

    const ineligible = setupEngine({ 0: { hand: [{ card: "EX5-012", as: "flaremon" }] } });
    await ineligible.ready();
    ineligible.state.memory = 7;
    expect(
      ineligible.engine.applyIntent(0, { type: "playCard", instanceId: ineligible.inst("flaremon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => ineligible.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-012"), 500);
    expect(ineligible.state.memory).toBe(0);
  });

  it("reduces digivolution cost by two only when the qualifying stack exists", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX5-008", as: "base", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "EX5-012", as: "flaremon" }],
      },
    });
    await eligible.ready();
    eligible.state.memory = 3;
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("base").permanentId,
        instanceId: eligible.inst("flaremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("base").topCard?.cardId === "EX5-012", 500);
    expect(eligible.state.memory).toBe(2);

    const ineligible = setupEngine({
      0: {
        battleArea: [{ card: "EX5-008", as: "base" }],
        hand: [{ card: "EX5-012", as: "flaremon" }],
      },
    });
    await ineligible.ready();
    ineligible.state.memory = 3;
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("base").permanentId,
        instanceId: ineligible.inst("flaremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ineligible.perm("base").topCard?.cardId === "EX5-012", 500);
    expect(ineligible.state.memory).toBe(0);
  });

  it("applies the inherited DP bonus only to the stacked host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-008", as: "boosted", under: ["EX5-012"] },
          { card: "BT1-009", as: "plain", under: ["EX5-012"] },
        ],
      },
    });
    await s.ready();
    expect(s.perm("boosted").currentDP).toBe(6000);
    expect(s.perm("plain").currentDP).toBe(5000);
  });
});
