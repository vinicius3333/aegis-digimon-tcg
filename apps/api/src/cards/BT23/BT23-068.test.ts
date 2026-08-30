import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-068.js";

describe("BT23-068 GranDracmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-068")).toMatchObject({
      cardId: "BT23-068",
      nameEn: "GranDracmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Undead", "CS"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

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
      fireCondition: {
        kind: "digivolvedFromZone",
        zone: "trash",
      },
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" }, count: "all" } },
      ],
    });
    expect(effect.actions[0].fromZone).toBeUndefined();
  });

  it("does not delete opposing Digimon when the watched evolution comes from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-068", as: "watcher" },
            { card: "BT23-062", as: "base" },
          ],
          hand: [{ card: "BT23-063", as: "manual" }],
        },
        1: { battleArea: [{ card: "BT23-055", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("manual").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("manual").instanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-055")).toBe(true);
  });

  it("on deletion evolves another Digimon into GranDracmon from trash for free, then the new GranDracmon deletes all lowest-level opponents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-068", as: "source" },
            { card: "BT23-066", as: "base" },
          ],
          trash: [{ card: "BT23-068", as: "into" }],
        },
        1: {
          battleArea: [
            { card: "BT23-061", as: "low1" },
            { card: "BT23-062", as: "low2" },
            { card: "BT23-063", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("into").instanceId);
    const memoryBefore = s.state.memory;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-068");
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(highId);
  });

  it("requires a level 5 Undead or CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Undead", "CS"], cost: 4, isAlternate: true },
    ]);
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-067", as: "base" }], hand: [{ card: "BT23-068", as: "gran" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("gran").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT23-068", as: "gran" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("gran").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
