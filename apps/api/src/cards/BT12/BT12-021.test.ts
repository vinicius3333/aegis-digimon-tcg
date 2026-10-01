import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-021.js";
import "./BT12-028.js";

describe("BT12-021 Veemon", () => {
  it("reveals three and must add one Imperialdramon/Free card plus one Davis-name card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-021", as: "veemon" }],
          deck: ["BT12-030", "BT8-088", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-030", "BT8-088"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it.each([
    ["only the Imperialdramon/Free branch", ["BT12-030", "BT1-009", "BT1-010"], "BT12-030"],
    ["only the Davis-name branch", ["BT8-088", "BT1-009", "BT1-010"], "BT8-088"],
  ])("adds the available card when the reveal contains %s", async (_case, deck, expected) => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-021", as: "veemon" }], deck } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === expected));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([expected]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it.each([false, true])(
    "DNA digivolves with a legal partner when an incompatible partner is present: %s",
    async (withInvalidPartner) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-032", as: "blue", under: ["BT12-021"] },
              ...(withInvalidPartner ? [{ card: "BT1-015", as: "red" }] : []),
              { card: "BT1-069", as: "green" },
            ],
            hand: [{ card: "BT12-028", as: "paildramon" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      const blueTop = s.perm("blue").topCard.instanceId;
      const greenTop = s.perm("green").topCard.instanceId;
      await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("blue"));
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-028"));
      const result = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-028")!;
      expect(result.stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining([blueTop, greenTop]));
      expect(s.state.memory).toBe(3);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
        expect.arrayContaining(withInvalidPartner ? ["BT12-028", "BT1-015"] : ["BT12-028"]),
      );
      expect(s.state.players[0]!.battleArea).toHaveLength(withInvalidPartner ? 2 : 1);
    },
  );

  it.each(["missing", "wrong-color", "opponent-only"] as const)(
    "does not offer inherited DNA with a %s partner",
    async (partner) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-032", as: "blue", under: ["BT12-021"] },
              ...(partner === "wrong-color" ? [{ card: "BT1-015", as: "red" }] : []),
            ],
            hand: [{ card: "BT12-028", as: "paildramon" }],
          },
          1: { battleArea: partner === "opponent-only" ? [{ card: "BT1-069", as: "green" }] : [] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("blue"));
      expect(s.perm("blue").topCard.cardId).toBe("BT1-032");
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("paildramon").instanceId]);
      expect(s.decisions).toHaveLength(0);
    },
  );
});

describe("BT12-021 Veemon — KB Q&A rulings", () => {
  const playVeemonRevealing = (deck: string[], opts: { autoSelectCards?: boolean } = {}) => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-021", as: "veemon" }], deck } },
      { autoSelectCards: opts.autoSelectCards ?? true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    return s;
  };
  const handCardIds = (s: EngineSetup) => s.state.players[0]!.hand.map(({ cardId }) => cardId);
  const revealSelections = (s: EngineSetup) =>
    s.decisions.filter(({ req }) => req.kind === "selectCards").map(({ req }) => req);

  it("adds the one qualifying card when the reveal holds only an Imperialdramon/Free card or only a Davis card (Q2148)", async () => {
    const s = playVeemonRevealing(["BT12-030", "BT1-009", "BT1-010"]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(handCardIds(s)).toEqual(["BT12-030"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    expect(revealSelections(s)).toHaveLength(1);

    const davisOnly = playVeemonRevealing(["BT8-088", "BT1-009", "BT1-010"]);
    await settle(() => davisOnly.state.players[0]!.hand.length === 1);
    expect(handCardIds(davisOnly)).toEqual(["BT8-088"]);
    expect(davisOnly.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("must add both the Imperialdramon/Free card and the Davis card when both are revealed (Q2149)", async () => {
    const s = playVeemonRevealing(["BT12-030", "BT8-088", "BT1-009"], { autoSelectCards: false });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const imperialSlot = revealSelections(s)[0]!;
    expect(imperialSlot.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: imperialSlot.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    const imperialId = s.state.players[0]!.deck.find(({ cardId }) => cardId === "BT12-030")!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: imperialSlot.decisionId,
        response: { kind: "selectCards", instanceIds: [imperialId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => revealSelections(s).length === 2);
    const davisSlot = revealSelections(s)[1]!;
    expect(davisSlot.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: davisSlot.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: davisSlot.decisionId,
        response: { kind: "selectCards", instanceIds: davisSlot.options?.candidateInstanceIds ?? [] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(handCardIds(s).sort()).toEqual(["BT12-030", "BT8-088"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("can add the revealed [Davis Motomiya & Ken Ichijoji] as its Davis card, but not another Tamer (Q2150)", async () => {
    const s = playVeemonRevealing(["BT8-088", "BT1-085", "BT1-009"]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    const davisSlot = revealSelections(s)[0]!;
    const taiId = s.state.players[0]!.deck.find(({ cardId }) => cardId === "BT1-085")!.instanceId;
    expect(davisSlot.options?.candidateInstanceIds).toHaveLength(1);
    expect(davisSlot.options?.candidateInstanceIds).not.toContain(taiId);
    expect(handCardIds(s)).toEqual(["BT8-088"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-085"]);
  });
});
