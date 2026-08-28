import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-044";

describe("EX11-044 Pyramidimon", () => {
  it("preserves printed stats, keywords, exact optional cost, and bottom-stack recovery", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Pyramidimon",
      colors: ["Black"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      types: ["Mineral", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Fragment", amount: 3 }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ex11-044-main-effect" });
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        target: { filter: { superlative: "highestPlayCost", kind: ["Digimon", "Tamer"] } },
        cost: { kind: "trash", target: { from: ["digivolutionCards"], count: 3 } },
      });
    }
    const recovery = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(recovery.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { isSelfRef: true, byEffect: true },
    });
    expect(irNode(recovery.actions[0]!).actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
    expect(irNode(recovery.actions[0]!).actions[0]!.target).toMatchObject({ from: ["trash"], count: 3 });
    expect(irNode(recovery.actions[0]!).actions[0]!.target.upTo).toBeUndefined();
  });

  it("pays exactly 3 Mineral sources, deletes only the highest cost, and recovers all 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "source",
              under: [
                { card: "EX11-038", as: "firstMineral" },
                { card: "EX11-038", as: "secondMineral" },
                { card: "EX11-038", as: "thirdMineral" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost6").permanentId);
    const cost5Id = s.perm("cost5").permanentId;
    const cost6Id = s.perm("cost6").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost6Id);
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-038", "EX11-038", "EX11-038"]);
    assertNoLoudGap(s);
  });
});
