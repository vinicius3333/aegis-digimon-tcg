import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-039";

describe("EX11-039 HoverEspimon", () => {
  it("preserves printed stats, trait evolution, one-Tamer condition, and inherited Jamming", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "HoverEspimon",
      colors: ["Black", "Blue"],
      level: 4,
      playCost: 4,
      dp: 5000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Cyborg", "Machine"], cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    const effect = compiled.effects.find((candidate) => candidate.trigger === "WhenDigivolving")!;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
    });
    expect(irNode(effect.actions[0]!).target.filter.nameOrTrait).toEqual([{ tokens: ["Altea"], match: "nameExact" }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Jamming" })],
      }),
    );
  });

  it("plays Altea for free when the controller has exactly 1 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-085", as: "existingTamer" },
          ],
          hand: [{ card: "EX11-064", as: "altea" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-064")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not offer Altea when the controller already has 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
          hand: [{ card: "EX11-064", as: "altea" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("altea").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    assertNoLoudGap(s);
  });
});
