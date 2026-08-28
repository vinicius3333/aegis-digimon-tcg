import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-048";

describe("EX11-048 Ghostmon", () => {
  it("preserves the printed card, Ghost targeting, Retaliation duration, and inherited memory", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Ghostmon",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      types: ["Ghost", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((candidate) => candidate.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        duration: "untilOpponentTurnEnd",
        keyword: { keyword: "Retaliation" },
        target: {
          count: 1,
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        },
      });
    }
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("gives Retaliation to 1 own Ghost but never a near-matching non-Ghost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT20-063", as: "ghost" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(
      [s.perm("source"), s.perm("ghost")].filter((card) => observe(s.engine).hasKeyword(card, "Retaliation")),
    ).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Retaliation")).toBe(false);
    assertNoLoudGap(s);
  });

  it("gains 1 memory when a host carrying Ghostmon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId] }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });
});
