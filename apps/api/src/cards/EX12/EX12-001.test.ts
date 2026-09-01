import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-001 Nyaromon", () => {
  it("attacks only with the DNA result", () => {
    const effect = registeredCompiledCards.get("EX12-001")!.effects[0]!;
    expect(effect.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      bindResultAs: "dnaResult",
      materials: { count: 2, filter: { includesSelf: true } },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { filter: { boundRef: "dnaResult" } } });
  });

  it("DNA-digivolves the inherited VB Digimon with any other legal Digimon and resolves Q6722", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-054", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
        1: {
          battleArea: [{ card: "EX12-005", as: "target", suspended: true, dp: 9000 }],
          security: ["EX12-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const player = s.state.players[0]!;
    const sourceId = s.perm("source").permanentId;
    const partnerId = s.perm("partner").permanentId;

    const firing = advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const orderDecision = s.state.pendingDecision!;
    const orderRequest = s.decisions.at(-1)!.req;
    const orderOptions = orderRequest.options as { triggerKeys: string[]; triggerCardIds: string[] };
    expect(orderOptions.triggerKeys).toHaveLength(2);
    expect(orderOptions.triggerCardIds).toEqual(["EX12-044", "EX12-044"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderTriggers", order: [orderOptions.triggerKeys[1]!] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-044"));
    await settle(() => s.state.pendingDecision === undefined);

    const merged = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-044");
    expect(merged).toBeDefined();
    expect(player.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
    expect(player.battleArea.some((permanent) => permanent.permanentId === partnerId)).toBe(false);
    expect(merged!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-042", "EX12-001", "EX12-054"]),
    );
    expect(merged!.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(player.hand.some((card) => card.cardId === "EX12-044")).toBe(false);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("does not offer the optional DNA digivolution without a second qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-042", as: "source", under: ["EX12-001"] }],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("EX12-042");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });

  it("does not waive the destination's printed DNA material requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-005", as: "wrongLevelPartner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX12-042",
      "EX12-005",
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });

  it("does not activate when Nyaromon's host lacks the VB trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-054", as: "source", under: ["EX12-001"] },
            { card: "EX12-042", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX12-054",
      "EX12-042",
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });

  it("may DNA digivolve and independently decline the resulting attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-054", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    const firing = advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-044") &&
        s.state.pendingDecision?.kind === "optional",
    );
    const attackDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    const merged = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-044");
    expect(merged).toBeDefined();
    expect(merged!.isSuspended).toBe(false);
  });

  it("does not attack when the controller declines the optional DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-010", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX12-042",
      "EX12-010",
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });

  it("does not use an opponent's Digimon as the other DNA material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-042", as: "source", under: ["EX12-001"] }],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
        1: { battleArea: [{ card: "EX12-054", as: "opponentPartner" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-042"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-054"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });
});
