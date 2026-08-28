import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-074.js";

describe("EX8-074", () => {
  it("reduces its play cost by 4 by suspending 2 Digimon and has Alliance and Vortex", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend", target: { count: 2 } } }],
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ]),
    );
  });
  it("suspends a Digimon, deletes an opposing Digimon up to 8000 DP, and reactivates its own effect once per turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({
      kind: "CostModifier",
      mode: "raiseCeiling",
      costType: "dpDeletion",
      amount: 3000,
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controllerDefault: "both", excludeSelf: true, suspended: true, kind: ["Digimon"] },
      },
    });
    expect(actions[2]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 8000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "both", kind: ["Digimon"] },
      actions: [
        {
          kind: "ActivateEffect",
          effectType: "WhenDigivolving",
          optional: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("exposes Alliance and Vortex on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-074", as: "medieval" }] } });
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Vortex")).toBe(true);
  });

  it("raises the deletion ceiling before choosing a target for each other suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-074", as: "medieval" },
            { card: "AD1-001", as: "first-suspended", suspended: true },
            { card: "BT1-010", as: "second-suspended", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "14000-dp-target", dp: 14000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("medieval"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
  });
});
