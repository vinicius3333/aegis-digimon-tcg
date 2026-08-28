import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-038";

describe("EX11-038 Sunarizamon", () => {
  it("preserves printed stats, cross-stack trash cost, and inherited discard trigger", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Sunarizamon",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      types: ["Reptile", "LIBERATOR", "Mineral"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash", target: { from: ["hand", "digivolutionCards"], count: 1 } },
      });
      expect(irNode(effect.actions[0]!.cost).target.filter.nameOrTrait).toEqual([
        { tokens: ["Mineral", "Rock"], match: "trait" },
      ]);
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { controller: "mine" },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("pays the draw cost with a Mineral card under another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-080", as: "other", under: [{ card: "EX11-044", as: "mineralCost" }] },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mineralCost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("draws when trashed by an effect from a Mineral host's evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-044", as: "host", under: [{ card: cardId, as: "source" }] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });
});
