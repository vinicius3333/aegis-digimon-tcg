import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-007.js";

describe("BT20-007 Dracomon", () => {
  it("requires the printed hand trash cost and resolves draw plus memory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions).toHaveLength(2);
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "trash" } });
    expect(main?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
    expect(compiled.digivolutionRequirement).toContainEqual({ names: ["Bebydomon"], cost: 0, isAlternate: true });
  });

  it("pays the matching text cost before drawing and gaining memory, and may decline the whole effect", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [
            { card: "BT20-023", as: "dracomonText" },
            { card: "BT20-010", as: "nonMatch" },
          ],
          deck: [{ card: "BT20-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(accepted.engine).fire(EffectTiming.OnStartMainPhase, accepted.perm("dracomon"));
    expect(accepted.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      accepted.inst("dracomonText").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      accepted.inst("nonMatch").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(accepted.inst("drawn").instanceId);
    expect(accepted.state.memory).toBe(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [{ card: "BT20-023", as: "cost" }],
          deck: [{ card: "BT20-011", as: "top" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const declinedTurn = declined.engine.runOneTurn();
    await advance(declined.engine).waitForMainPhase(0);
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);
    expect(declined.state.players[0]!.deck.map((card) => card.instanceId)).toContain(declined.inst("top").instanceId);
    expect(declined.state.memory).toBe(0);
    advance(declined.engine).endMainPhaseIfOpen(0);
    await declinedTurn;
  });

  it("observably gives its inherited host +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-012", dp: 4000, as: "host", under: ["BT20-002", "BT20-007"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("resolves Start of Main Phase through the natural turn lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [{ card: "BT20-023", as: "payment" }],
          deck: [
            { card: "BT20-010", as: "turnDraw" },
            { card: "BT20-011", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turnDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("effectDraw").instanceId);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally pays either independent text alternative, and refuses with no matching hand card", async () => {
    const alternatives = [
      { id: "EX3-018", token: "[Dracomon]", absent: "[Examon]", as: "dracomonText" },
      { id: "BT20-025", token: "[Examon]", absent: "[Dracomon]", as: "examonText" },
    ] as const;
    for (const alternative of alternatives) {
      const definition = getCardDefinition(alternative.id)!;
      expect(definition.effectText).toContain(alternative.token);
      expect(definition.effectText).not.toContain(alternative.absent);
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-007", as: "dracomon" }],
            hand: [{ card: alternative.id, as: alternative.as }],
            deck: ["BT20-010", "BT20-011", "BT20-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(alternative.as).instanceId),
      );
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst(alternative.as).instanceId);
      // The first player skips the ordinary first-turn draw; the effect therefore draws the
      // deck's first card directly rather than the second card.
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-010");
      expect(s.state.memory).toBe(4);
      expect(s.state.phase).toBe(Phase.Main);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    }

    const noMatch = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [{ card: "BT20-010", as: "unrelated" }],
          deck: ["BT20-011", "BT20-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(getCardDefinition("BT20-010")!.effectText).not.toContain("[Dracomon]");
    expect(getCardDefinition("BT20-010")!.effectText).not.toContain("[Examon]");
    noMatch.state.memory = 3;
    const noMatchTurn = noMatch.engine.runOneTurn();
    await advance(noMatch.engine).waitForMainPhase(0);
    await settle(() => noMatch.state.pendingDecision === undefined);
    expect(noMatch.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      noMatch.inst("unrelated").instanceId,
    );
    expect(noMatch.state.players[0]!.trash).toHaveLength(0);
    expect(noMatch.state.memory).toBe(3);
    advance(noMatch.engine).endMainPhaseIfOpen(0);
    await noMatchTurn;
  });

  it("reaches Dracomon and its inherited host through legal public breeding evolutions", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-002", as: "bebydomon" },
          hand: [
            { card: "BT20-007", as: "dracomon" },
            { card: "BT20-012", as: "ginryumon" },
          ],
          deck: ["BT20-010", "BT20-010", "BT20-010", "BT20-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    for (const alias of ["dracomon", "ginryumon"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("bebydomon").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("bebydomon").topCard.cardId === s.inst(alias).cardId);
    }
    expect(s.perm("bebydomon").stack.map((card) => card.cardId)).toEqual(["BT20-002", "BT20-007"]);
    expect(s.state.memory).toBe(2);
    expect(s.perm("bebydomon").currentDP).toBe(6000);
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("bebydomon").permanentId })).toEqual(
      { ok: true },
    );
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("bebydomon").currentDP).toBe(8000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("bebydomon").currentDP).toBe(6000);
  });
});
