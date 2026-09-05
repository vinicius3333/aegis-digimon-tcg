import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-033.js";
import "../index.js";

describe("EX10-033 Pyramidimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition("EX10-033")).toMatchObject({
      colors: ["Black"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
    });
  });
  it("proves Fragment, shared once-per-turn placement, and scaled play-cost reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    const placeEffects = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "PlaceUnder");
    expect(placeEffects).toHaveLength(2);
    expect(placeEffects?.map((effect) => [effect.trigger, effect.frequency, effect.sharedUseKey])).toEqual([
      ["WhenDigivolving", "OncePerTurn", "ir-shared-0"],
      ["WhenAttacking", "OncePerTurn", "ir-shared-0"],
    ]);
    for (const effect of placeEffects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "PlaceUnder",
        position: "bottom",
        target: { filter: { zone: "trash", controller: "mine" }, count: 3, upTo: true, minimum: 1, from: ["trash"] },
      });
      expect(effect.optional).toBe(true);
    }

    const reductions = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "CostModifier");
    expect(reductions).toHaveLength(2);
    for (const effect of reductions ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "CostModifier",
        mode: "reduce",
        costType: "play",
        amount: 2,
        existingPermanent: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine" }, count: 3, upTo: true, minimum: 1, from: ["digivolutionCards"] },
        },
        // "for each card trashed" is the cost's paid count, not a board count.
        scaling: { per: 1, usePaidCount: true, unit: "cards" },
        abortOnDecline: true,
      });
    }
  });

  it("Q5095/Q5096 places 1-3 Mineral/Rock cards, including a Digi-Egg, at its bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-033", as: "pyramid", under: [{ card: "BT1-009", as: "oldBottom" }] }],
          trash: [
            { card: "EX10-025", as: "mineral" },
            { card: "EX10-003", as: "egg" },
            { card: "EX10-028", as: "rock" },
            { card: "BT1-009", as: "near" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("mineral").instanceId, s.inst("egg").instanceId, s.inst("rock").instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("pyramid"), "Fragment")).toBe(true);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("pyramid"));
    expect(
      s
        .perm("pyramid")
        .stack.slice(0, 3)
        .map(({ instanceId }) => instanceId),
    ).toEqual(
      expect.arrayContaining([s.inst("mineral").instanceId, s.inst("egg").instanceId, s.inst("rock").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("near").instanceId);
  });

  it("Q5097-Q5100 trashes 3 sources across stacks and reduces only the chosen permanent to 0", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-033", as: "pyramid" },
            { card: "EX10-028", as: "firstHost", under: [{ card: "BT10-062", as: "first" }] },
            {
              card: "EX10-028",
              as: "secondHost",
              under: [
                { card: "BT10-064", as: "second" },
                { card: "BT13-061", as: "third" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "AD1-003", as: "chosen" },
            { card: "AD1-003", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
      s.perm("chosen").permanentId,
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("pyramid"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId]),
    );
    const definition = getCardDefinition("AD1-003")!;
    const ledger = advance(s.engine).ledgers.modifiers;
    expect(
      ledger.playCostFor({ def: definition, controllerSeat: 1, permanentId: s.perm("chosen").permanentId }, 5),
    ).toBe(0);
    expect(
      ledger.playCostFor({ def: definition, controllerSeat: 1, permanentId: s.perm("other").permanentId }, 5),
    ).toBe(5);
  });
});
