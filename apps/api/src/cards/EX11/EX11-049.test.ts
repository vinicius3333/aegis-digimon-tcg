import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-049";

describe("EX11-049 Punkmon", () => {
  it("preserves the printed card, Evil evolution, attack sequence, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Punkmon",
      colors: ["Purple", "Red"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      types: ["Dark Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Evil"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      {
        kind: "Digivolve",
        from: ["trash"],
        payCost: true,
        reduceCost: 2,
        optional: true,
        into: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] },
      },
    ]);
  });

  it("can evolve into a Dark Dragon just trashed by the cost and pays the cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX11-050", as: "loudmon" },
            { card: "BT1-001", as: "other" },
          ],
        },
      },
      // EX11-050 matches BOTH its printed evoCost (Purple/Red Lv.4, cost 4) and its alternate
      // [Dark Dragon]/[Evil Dragon] requirement (cost 3), so the paying digivolve opens a
      // `chooseOption` route prompt. Without an answer the effect never resolves.
      // `autoChooseOption` takes index 0 — the printed route.
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").topCard.cardId).toBe("EX11-050");
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("charges the alternate Dark Dragon requirement, also reduced by 2, when that route is chosen", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX11-050", as: "loudmon" },
            { card: "BT1-001", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").topCard.cardId).toBe("EX11-050");
    // Alternate cost 3, reduced by 2 => 1 memory paid.
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("gives a host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});
