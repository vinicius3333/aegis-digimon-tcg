import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-047";

describe("EX11-047 Impmon", () => {
  it("preserves the printed card, Yaamon evolution, start-main cost, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Impmon",
      colors: ["Purple", "Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      types: ["Evil", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Yaamon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 2000, duration: "permanent" },
    ]);
  });

  it("trashes exactly 1 hand card, then gains 1 memory at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "BT1-001", as: "discard" },
            { card: "BT1-002", as: "keep" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gives its host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});
