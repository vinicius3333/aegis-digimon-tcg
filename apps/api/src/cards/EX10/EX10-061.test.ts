import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-061.js";
import "../index.js";

const CARD_ID = "EX10-061";

describe("EX10-061 Apocalymon", () => {
  it("records the exact catalog, alternate evolution, and complete contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["White"],
      level: 7,
      playCost: 17,
      dp: 16000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 6, traits: ["Dark Masters"], cost: 5, isAlternate: true }],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          cost: {
            kind: "place",
            optional: true,
            target: { filter: { zone: "security", faceUp: true }, count: "all", distinctNames: true },
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amountPerPlaced: 4 }],
        },
      ],
    });
  });

  it("Q5783/Q5784: places one face-up card of each distinct Dark Masters name and reduces cost by 4 each", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-061", as: "apocalymon" }],
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "BT15-031", as: "duplicateMetal", faceUp: true },
            { card: "EX10-020", as: "puppet", faceUp: true },
            { card: "BT1-009", as: "faceDown", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    const apocalymon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-061")!;
    expect(apocalymon.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX10-061", "EX10-012", "EX10-020"]),
    );
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(
      s.inst("duplicateMetal").instanceId,
    );
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("faceDown").instanceId);
    expect(s.state.memory).toBe(-10);
  });

  it("Q5785/Q5786: plays one of each distinct Dark Masters name from its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-061",
              as: "apocalymon",
              under: ["EX10-012", "BT15-031", "EX10-020", "EX10-035"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("apocalymon"));
    await settle(() => s.state.players[0]!.battleArea.length === 4);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX10-061", "EX10-012", "EX10-020", "EX10-035"]),
    );
    expect(s.perm("apocalymon").stack).toHaveLength(1);
    expect(["EX10-012", "BT15-031"]).toContain(s.perm("apocalymon").stack[0]!.cardId);
    for (const permanent of s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId !== CARD_ID)) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(true);
    }

    const apocalymonId = s.perm("apocalymon").permanentId;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([apocalymonId]);
  });
});
