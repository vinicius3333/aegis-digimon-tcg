import { describe, expect, it } from "vitest";
import { EffectTiming, assemblyRequirementFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

describe("EX12-017 WarGreymon", () => {
  it("de-digivolves two cards and then deletes the opponent's lowest DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-017", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "lowest", dp: 3000 },
            { card: "BT1-011", as: "stacked", dp: 7000, under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const lowestId = s.perm("lowest").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowestId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
  });

  it("uses the same de-digivolve/delete sequence on When Digivolving and When Attacking", async () => {
    const module = getEffectModule("EX12-017")!;
    const source = { cardId: "EX12-017", ownerSeat: 0 } as never;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, source)).toHaveLength(1);
    for (const timing of ["WhenDigivolving", "WhenAttacking"]) {
      expect(registeredCompiledCards.get("EX12-017")!.effects.find((effect) => effect.trigger === timing)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "DeDigivolve", amount: 2, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
          { kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" } } },
        ],
      });
    }
  });

  it("offers its Counter response and keeps Counter once-per-turn independent from the main timing group", () => {
    const compiled = registeredCompiledCards.get("EX12-017")!;
    const counter = compiled.effects.find((effect) => effect.trigger === "Counter")!;
    expect(counter.frequency).toBe("OncePerTurn");
    expect(counter.sharedUseKey).toBeUndefined();
    expect(counter.actions).toMatchObject([
      {
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }, { tokens: ["ME", "VB"], match: "trait" }] },
        payCost: true,
        optional: true,
      },
      { kind: "RedirectAttack", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true },
    ]);
  });

  it("preserves all four DNA color routes and plays through the three-card Assembly recipe", async () => {
    const compiled = registeredCompiledCards.get("EX12-017")!;
    expect(compiled.dnaDigivolveRequirement).toEqual([
      { cost: 0, materials: [{ color: "Red", level: 5 }, { color: "Black", level: 5 }] },
      { cost: 0, materials: [{ color: "Red", level: 5 }, { color: "Purple", level: 5 }] },
      { cost: 0, materials: [{ color: "Yellow", level: 5 }, { color: "Black", level: 5 }] },
      { cost: 0, materials: [{ color: "Yellow", level: 5 }, { color: "Purple", level: 5 }] },
    ]);
    expect(assemblyRequirementFor("EX12-017")).toEqual([
      {
        materials: [
          { count: 1, nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }, { tokens: ["ME", "VB"], match: "trait" }], level: 5 },
          { count: 1, nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }, { tokens: ["ME", "VB"], match: "trait" }], level: 4 },
          { count: 1, nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }, { tokens: ["ME", "VB"], match: "trait" }], level: 3 },
        ],
        reduceCost: 6,
      },
    ]);

    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-017", as: "source" }],
        trash: [
          { card: "EX12-016", as: "level5" },
          { card: "EX12-010", as: "level4" },
          { card: "EX12-005", as: "level3" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
      assembly: { materialInstanceIds: [s.inst("level5").instanceId, s.inst("level4").instanceId, s.inst("level3").instanceId] },
    } as never)).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard?.cardId === "EX12-017");
      return permanent?.stack.length === 3 && s.state.players[0]!.trash.length === 0;
    });

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-017")!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-016", "EX12-010", "EX12-005"]));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("keeps Decode, Security Attack +1, evolution routes, and the shared Once Per Turn group", () => {
    const compiled = registeredCompiledCards.get("EX12-017")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ME", "VB"], cost: 3, isAlternate: true, level: 5 },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(2);
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.keywords?.some((keyword) => keyword.keyword === "SecurityAttack"))).toMatchObject({
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.keywords?.some((keyword) => keyword.keyword === "Decode"))).toMatchObject({
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.5 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)＞" }],
    });
    expect(compiled.effects.filter((effect) => effect.frequency === "OncePerTurn")).toHaveLength(4);
  });
});
