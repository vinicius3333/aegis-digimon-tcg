import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
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

  it("plays exact Altea for free through public alternate digivolution with 1 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-037", as: "source" },
            { card: "BT1-085", as: "existingTamer" },
          ],
          hand: [
            { card: cardId, as: "evolver" },
            { card: "EX11-064", as: "altea" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-064"));
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-037"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("keeps Altea in hand through public alternate digivolution with 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-037", as: "source" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
          hand: [
            { card: cardId, as: "evolver" },
            { card: "EX11-064", as: "altea" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("altea").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-064")).toBe(false);
    assertNoLoudGap(s);
  });

  it("rejects the alternate route for a level-3 peer without Cyborg or Machine", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonMatching" }],
        hand: [{ card: cardId, as: "evolver" }],
      },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonMatching").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("nonMatching").topCard.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });
});
