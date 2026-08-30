import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-019.js";
import "./BT5-109.js";

describe("BT5-109 Mega Digimon Fusion!", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-109")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("BT5-109")?.effects[0]?.actions[0]).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 6,
      once: true,
      duration: "forTheTurn",
      consumeBindAs: "digivolvedWithMegaDigimonFusion",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "eq", value: 6 },
        },
        count: "all",
      },
      into: {
        kind: ["Digimon"],
        levelComparison: { op: "eq", value: 7 },
      },
    });
    expect(runtimeCompiledCard("BT5-109")?.effects[0]?.actions[0]).toMatchObject({
      onConsume: [
        {
          kind: "Return",
          target: { fromSelectionRef: "digivolvedWithMegaDigimonFusion" },
          to: "deckBottom",
        },
      ],
    });
  });

  it("reduces the next level 6-to-7 digivolution by 6, then bottoms it and trashes its stack at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-019", as: "base", under: [{ card: "BT5-014", as: "source" }] },
            { card: "BT5-016", as: "other", under: [{ card: "BT5-014", as: "otherSource" }] },
            "BT5-086",
          ],
          hand: [
            { card: "BT5-109", as: "option" },
            { card: "BT5-086", as: "level7" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT5-019", as: "opponent", under: [{ card: "BT5-014", as: "opponentSource" }] }],
          deck: ["BT5-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const basePermanentId = s.perm("base").permanentId;
    const baseTopId = s.perm("base").topCard.instanceId;
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("level7").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.instanceId === s.inst("level7").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(2);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("level7").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT5-086"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("level7").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([baseTopId, s.inst("source").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === basePermanentId)).toBe(false);
    expect(s.perm("other").topCard.cardId).toBe("BT5-016");
    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherSource").instanceId);
    expect(s.perm("opponent").topCard.cardId).toBe("BT5-019");
    expect(s.perm("opponent").stack.map((card) => card.instanceId)).toContain(s.inst("opponentSource").instanceId);
  });

  it("consumes the reduction only once and binds the delayed cleanup to the digivolved Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-019", as: "first", under: [{ card: "BT5-014", as: "firstSource" }] },
            { card: "BT5-019", as: "second", under: [{ card: "BT5-014", as: "secondSource" }] },
            "BT5-086",
          ],
          hand: [
            { card: "BT5-109", as: "option" },
            { card: "BT5-086", as: "level7a" },
            { card: "BT5-086", as: "level7b" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT5-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("first").permanentId,
        instanceId: s.inst("level7a").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT5-086");
    expect(s.state.memory).toBe(10);
    const firstPermanentId = s.perm("first").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("second").permanentId,
        instanceId: s.inst("level7b").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT5-086");
    expect(s.state.memory).toBe(6);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstPermanentId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-086")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013", "BT5-086"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("level7a").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("firstSource").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondSource").instanceId);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-109", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
