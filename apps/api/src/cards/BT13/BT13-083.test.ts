import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-083.js";

describe("BT13-083 Gizmon: AT", () => {
  it("reduces play cost by deleting a level 3 Digimon", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0];
    expect(replacement).toMatchObject({
      sourceFilter: { isSelfRef: true },
    });
    if (replacement?.kind !== "Replacement") throw new Error("Expected play replacement action");
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 4,
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 } },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("draws 2, trashes 2, and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      restriction: "digivolve",
      duration: "permanent",
    });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: XT", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "return",
        target: {
          filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 2,
        },
        orderReturnedCards: true,
        to: "deckBottom",
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["trash"],
          target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Gizmon: XT"] }] }, count: 1 },
        },
      ],
    });
  });

  it("draws two cards and trashes two cards from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          deck: ["BT1-001", "BT1-002"],
          hand: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gizmon"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-003", "BT1-004"]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("returns exactly two Gizmon cards in any chosen order before playing Gizmon: XT on deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          trash: [
            { card: "BT13-080", as: "firstGizmon" },
            { card: "BT13-086", as: "xt" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstGizmon").instanceId, s.inst("gizmon").instanceId);
    await s.ready();
    const resolving = advance(s.engine).verb.deletePermanent([s.perm("gizmon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.state.pendingDecision!;
    const requestedOrder = [s.inst("gizmon").instanceId, s.inst("firstGizmon").instanceId];
    expect(ordering.payloadJson).toContain(s.inst("gizmon").instanceId);
    expect(ordering.payloadJson).toContain(s.inst("firstGizmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });
    await resolving;
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-086"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-086")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.instanceId)).toEqual(requestedOrder);
  });

  it("pays the return cost and declines cost-only play when no Gizmon: XT exists (Q2330)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          trash: [{ card: "BT13-080", as: "returnable" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("gizmon").permanentId]);
    await settle(() => s.state.players[0]!.deck.some((card) => card.cardId === "BT13-080"));
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT13-080")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-086")).toBe(false);
  });

  it("leaves the return cards and XT in trash when the wrapper is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          trash: [
            { card: "BT13-080", as: "returnable" },
            { card: "BT13-086", as: "xt" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("gizmon").permanentId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-083", "BT13-080", "BT13-086"]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-086")).toBe(false);
  });

  it("pays the wrapper and can decline the nested XT play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          trash: [
            { card: "BT13-080", as: "returnable" },
            { card: "BT13-086", as: "xt" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("gizmon").topCard!.instanceId, s.inst("returnable").instanceId);
    await s.ready();
    const resolving = advance(s.engine).verb.deletePermanent([s.perm("gizmon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const wrapper = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: wrapper.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== wrapper.decisionId,
    );
    const nested = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nested.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT13-080", "BT13-083"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT13-086");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-086")).toBe(false);
  });
});
