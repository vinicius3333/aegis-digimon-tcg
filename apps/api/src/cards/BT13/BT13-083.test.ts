import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-083.js";
import "../BT11/BT11-088.js";

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
      { kind: "Draw", controller: "mine", amount: 2, effectTextPart: "[On Play] ＜Draw 2＞." },
      {
        kind: "Trash",
        target: { filter: { controller: "mine", zone: "hand" }, count: 2 },
        effectTextPart: "Then, trash 2 cards in your hand.",
      },
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
          deck: ["BT1-009", "BT1-009"],
          hand: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gizmon"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-009"]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-009"]));
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

describe("BT13-083 Gizmon: AT — KB Q&A rulings", () => {
  it("cannot digivolve but can be placed under another Digimon by a card effect (Q2328)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-088", as: "bagramon" }] },
        1: {
          battleArea: [
            { card: "BT13-083", as: "gizmon" },
            { card: "BT1-038", as: "host" },
            { card: "BT13-082", as: "peckmon" },
          ],
          hand: [{ card: "BT13-085", as: "crowmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
    );
    const gizmonCardId = s.perm("gizmon").topCard!.instanceId;
    const gizmonPermanentId = s.perm("gizmon").permanentId;
    preferInstanceIds.push(gizmonCardId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: gizmonPermanentId,
        instanceId: s.inst("crowmon").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("gizmon").topCard?.cardId).toBe("BT13-083");
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("peckmon").permanentId,
        instanceId: s.inst("crowmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("peckmon").topCard?.cardId === "BT13-085");

    s.state.turnSeat = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("bagramon"));
    const gizmonIsDigivolutionCard = () =>
      s.state.players[1]!.battleArea.some(
        (permanent) =>
          permanent.permanentId !== gizmonPermanentId &&
          permanent.stack.some((card) => card.instanceId === gizmonCardId),
      );
    await settle(gizmonIsDigivolutionCard);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === gizmonPermanentId)).toBe(false);
    expect(gizmonIsDigivolutionCard()).toBe(true);
  });

  it("can return this card itself from the trash as part of its [On Deletion] cost (Q2329)", async () => {
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const selfId = s.perm("gizmon").topCard!.instanceId;
    const returnableId = s.inst("returnable").instanceId;
    const xtId = s.inst("xt").instanceId;
    preferInstanceIds.push(selfId, returnableId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("gizmon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === xtId));

    const returnCost = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && JSON.stringify(req).includes(returnableId),
    );
    expect(JSON.stringify(returnCost?.req)).toContain(selfId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([selfId, returnableId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(selfId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([xtId]);
  });
});
