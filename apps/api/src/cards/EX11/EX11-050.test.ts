import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-050";

describe("EX11-050 Loudmon", () => {
  it("preserves the printed card, trait evolution, hand cost, DP comparison, and conditional keywords", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Loudmon",
      colors: ["Purple", "Red"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      types: ["Cyborg", "LIBERATOR", "Dark Dragon"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((candidate) => candidate.trigger === trigger)?.actions).toMatchObject([
        { kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } },
        {
          kind: "Delete",
          target: {
            filter: {
              dp: {
                op: "lte",
                relativeToFilter: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] },
              },
            },
          },
        },
      ]);
    }
  });

  it("trashes 2 cards and deletes an opponent no stronger than an own Dark Dragon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 7000 },
            { card: "AD1-011", as: "tooLarge", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([s.perm("tooLarge").permanentId]);
    assertNoLoudGap(s);
  });

  it("grants Scapegoat only to own Dark/Evil Dragons while hand size is at most 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "EX11-049", as: "dragon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dragon"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Scapegoat")).toBe(false);
    assertNoLoudGap(s);
  });

  /**
   * Boundary for "While you have 4 or fewer cards in your hand" on BOTH the main [All Turns]
   * aura and the inherited [Your Turn] aura. FAILS-WHEN-REVERTED: an `op`/`value` other than
   * `lte 4` flips one of the two halves below.
   */
  it("withholds both auras at 5 cards in hand and restores them at 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "EX11-049", as: "inheritedHost", under: [cardId] },
        ],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-009"],
      },
    });
    await s.ready();
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Scapegoat")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "SecurityAttack")).toBe(false);

    s.state.players[0]!.hand.splice(0, 1);
    await advance(s.engine).recompute();

    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "SecurityAttack")).toBe(true);
    assertNoLoudGap(s);
  });

  it("gives own Dark/Evil Dragons Security Attack +1 from an inherited source on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-049", as: "host", under: [cardId] },
          { card: "BT1-009", as: "plain" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "SecurityAttack")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
    assertNoLoudGap(s);
  });
});
