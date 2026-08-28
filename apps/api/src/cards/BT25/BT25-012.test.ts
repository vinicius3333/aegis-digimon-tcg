import { getCardDefinition, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_012 } from "./BT25-012.js";
import "../index.js";

describe("BT25-012 Grizzlymon", () => {
  it("grants Raid and +3000 DP to one eligible non-Sea Animal Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_012.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        duration: "forTheTurn",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
          count: 1,
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "forTheTurn",
        target: { count: 1, sameTarget: true },
      });
    }
  });

  it("preserves the inherited +1000 DP", () => {
    expect(BT25_012.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("applies both entry clauses to one chosen eligible Digimon and excludes Sea Animal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-010", as: "beast" },
            { card: "BT24-034", as: "shaman" },
            { card: "BT24-029", as: "seaAnimalTs" },
            { card: "BT1-010", as: "nonMatching" },
          ],
          hand: [{ card: "BT25-012", as: "grizzlymon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("beast").permanentId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grizzlymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("beast").currentDP === 8000);

    expect(observe(s.engine).hasKeyword(s.perm("beast"), "Raid")).toBe(true);
    expect(s.perm("beast").currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Raid")).toBe(false);
    expect(s.perm("shaman").currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(s.perm("seaAnimalTs"), "Raid")).toBe(false);
    expect(s.perm("seaAnimalTs").currentDP).toBe(7000);
    expect(s.perm("nonMatching").currentDP).toBe(2000);
  });

  it("reuses the first target during When Digivolving instead of prompting again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-031", as: "base" },
            { card: "BT11-010", as: "firstTarget" },
            { card: "BT24-034", as: "secondTarget" },
          ],
          hand: [{ card: "BT25-012", as: "grizzlymon" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grizzlymon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined, 50);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).hasKeyword(s.perm("firstTarget"), "Raid")).toBe(true);
    expect(s.perm("firstTarget").currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(s.perm("secondTarget"), "Raid")).toBe(false);
    expect(s.perm("secondTarget").currentDP).toBe(5000);
  });

  it("supports the alternate TS evolution and inherited DP", async () => {
    const requirements = digivolutionRequirementsFor("BT25-012");
    expect(requirements).toContainEqual({ level: 3, traits: ["TS"], cost: 2, isAlternate: true });
    expect(getCardDefinition("BT25-012")).toMatchObject({
      colors: ["Red", "Green"],
      level: 4,
      playCost: 5,
      dp: 6000,
      types: ["Beast", "Iliad", "TS"],
    });

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT25-012"] }] } });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(3000);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: "BT25-012", as: "grizzlymon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("grizzlymon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
