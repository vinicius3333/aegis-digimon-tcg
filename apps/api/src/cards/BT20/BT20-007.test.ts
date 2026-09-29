import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { getCardDefinition, Phase } from "@aegis/shared";
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
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Bebydomon"],
      cost: 0,
      isAlternate: true,
    });
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
    await accepted.ready();
    const acceptedTurn = accepted.engine.runOneTurn();
    await advance(accepted.engine).waitForMainPhase(0);
    await settle(() =>
      accepted.state.players[0]!.trash.some((card) => card.instanceId === accepted.inst("dracomonText").instanceId),
    );
    expect(accepted.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      accepted.inst("dracomonText").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      accepted.inst("nonMatch").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(accepted.inst("drawn").instanceId);
    expect(accepted.state.memory).toBe(1);
    advance(accepted.engine).endMainPhaseIfOpen(0);
    await acceptedTurn;

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
    expect(declined.decisions.some(({ req }) => req.kind === "selectCards")).toBe(true);
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

describe("BT20-007 Dracomon — KB Q&A rulings", () => {
  async function startOfMainPhaseCost(hand: { card: string; as: string }[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand,
          deck: ["BT20-011", "BT20-011", "BT20-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined && s.state.memory !== 3);
    const costPrompt = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.sourceInstanceId === s.perm("dracomon").topCard.instanceId,
    );
    const offeredInstanceIds = [...(costPrompt?.req.options?.candidateInstanceIds ?? [])].sort();
    const trashedInstanceIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    const memory = s.state.memory;
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    return { s, offeredInstanceIds, trashedInstanceIds, memory };
  }

  it("accepts a card with [Dracomon] in its text or one with [Examon] in its text as the trash cost, and nothing else (Q4290)", async () => {
    expect(getCardDefinition("BT21-046")!.effectText).toContain("[Dracomon]");
    expect(getCardDefinition("BT21-046")!.effectText).not.toContain("Examon");
    expect(getCardDefinition("BT20-025")!.effectText).toContain("[Examon]");
    expect(getCardDefinition("BT20-025")!.effectText).not.toContain("Dracomon");

    const { s, offeredInstanceIds, trashedInstanceIds, memory } = await startOfMainPhaseCost([
      { card: "ST1-03", as: "unrelatedAgumon" },
      { card: "BT21-046", as: "dracomonText" },
      { card: "BT20-010", as: "unrelatedRyudamon" },
      { card: "BT20-025", as: "examonText" },
    ]);
    expect(offeredInstanceIds).toEqual([s.inst("dracomonText").instanceId, s.inst("examonText").instanceId].sort());
    expect(trashedInstanceIds).toHaveLength(1);
    expect(offeredInstanceIds).toContain(trashedInstanceIds[0]);
    expect(memory).toBe(4);
  });

  it("counts a card whose name contains [Dracomon] or [Examon] as having it in its text (Q4291)", async () => {
    for (const nameOnlyCard of ["ST1-04", "BT20-045"]) {
      const definition = getCardDefinition(nameOnlyCard)!;
      const printedText = `${definition.effectText ?? ""} ${definition.inheritedEffectText ?? ""}`.toLowerCase();
      expect(printedText).not.toContain("dracomon");
      expect(printedText).not.toContain("examon");
    }

    const { s, offeredInstanceIds, trashedInstanceIds, memory } = await startOfMainPhaseCost([
      { card: "ST1-03", as: "unrelated" },
      { card: "ST1-04", as: "namedDracomon" },
      { card: "BT20-045", as: "namedExamon" },
    ]);
    expect(offeredInstanceIds).toEqual([s.inst("namedDracomon").instanceId, s.inst("namedExamon").instanceId].sort());
    expect(trashedInstanceIds).toHaveLength(1);
    expect(trashedInstanceIds).not.toContain(s.inst("unrelated").instanceId);
    expect(memory).toBe(4);
  });
});
