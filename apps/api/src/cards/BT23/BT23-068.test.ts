import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-068.js";

describe("BT23-068 GranDracmon", () => {
  it("plays a qualifying level-4-or-lower purple Digimon from trash and rejects a higher-level card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-068", as: "grandracmon" }],
          trash: [
            { card: "BT23-063", as: "lowPurple" },
            { card: "BT23-067", as: "highPurple" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.inst("lowPurple").instanceId;
    const highId = s.inst("highPurple").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.WhenDigivolving, {
      subjectPermanentId: s.perm("grandracmon").permanentId,
    });
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === lowId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === highId)).toBe(true);
  });

  it("allows a level 6 or lower Undead or Dark Animal to digivolve from trash at the start of the main phase and on deletion", () => {
    const effects = compiled.effects.filter(
      (entry) => entry.trigger === "StartOfYourMainPhase" || entry.trigger === "OnDeletion",
    );
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "Digivolve",
        from: ["trash"],
        payCost: false,
        optional: true,
        into: {
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }],
        },
      });
    }
  });

  it("plays a level 4 or lower purple Digimon from trash when digivolving", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } },
    });
  });

  it("once per turn deletes all opponent's lowest-level Digimon when one of your Digimon digivolves from trash", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      fromZone: "trash",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" }, count: "all" } },
      ],
    });
  });

  it("requires a level 5 Undead or CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Undead", "CS"], cost: 4, isAlternate: true },
    ]);
  });
});
