import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-017.js";

describe("LM-017 Regulusmon", () => {
  it("registers its Blast Digivolve and complete once-per-turn source-add reaction", () => {
    const compiled = runtimeCompiledCard("LM-017")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects.find((effect) => effect.frequency === "OncePerTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "PlayWithoutCost", cost: { kind: "deleteOwn" }, from: ["trash"] }],
        },
      ],
    });
  });

  it("plays through the engine, trashes a hand card, and places Gammamon text under itself", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-017", as: "regulusmon" }, { card: "BT1-001", as: "cost" }], trash: ["LM-016"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulusmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "LM-016")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "LM-016"))).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("deletes a level 4 or lower Digimon to play one from trash after gaining a source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-017", as: "regulusmon" }, { card: "BT1-009", as: "sacrifice" }],
          trash: [{ card: "LM-016", as: "revive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const regulusmon = s.perm("regulusmon");
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: regulusmon.permanentId,
      addedDigivolutionCardInstanceIds: [],
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "LM-016"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "LM-016")).toBe(true);
  });
});
