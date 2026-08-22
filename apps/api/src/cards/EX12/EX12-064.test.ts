import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-064.js";

describe("EX12-064 Megadramon", () => {
  it("maps the catalog, evolution, delete fallback, trait watcher, and inherited cost", () => {
    const card = getCardDefinition("EX12-064");
    expect(card?.effectText).toContain("[Assembly -2]");
    expect(card?.inheritedEffectText).toContain("lowest play cost");
    expect(digivolutionRequirementsFor("EX12-064")).toEqual([
      { level: 4, traits: ["Machine", "ME"], cost: 3, isAlternate: true },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
              },
              count: 1,
            },
          },
          {
            kind: "DeDigivolve",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      });
    }

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Machine", "Cyborg", "ME"], match: "trait" }],
          },
          actions: [{ kind: "ReactivateEffect", fromTrigger: "WhenDigivolving", count: 1, optional: true }],
        },
      ],
    });

    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { superlative: "lowestPlayCost" }, count: 1 },
          cost: { kind: "unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes exactly one opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-064", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-082", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-082"]);
  });

  it("de-digivolves when no level-4-or-lower target exists", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-064", as: "source" }] },
        1: { battleArea: [{ card: "EX12-059", as: "opponent", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("opponent").stack.length === 0);

    expect(s.perm("opponent").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("reactivates the When Digivolving effect for a matching played trait and only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-064", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("source").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("source").permanentId });
    await settle(() => false, 60);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("allows declining the optional trait watcher", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-064", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("source").permanentId });
    await settle(() => false, 60);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("unsuspends the inherited host and deletes the own Digimon with the lowest play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-059", as: "host", suspended: true, under: ["EX12-064"] },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => !s.perm("host").isSuspended && s.state.players[0]!.battleArea.length === 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-059"]);
  });
});
