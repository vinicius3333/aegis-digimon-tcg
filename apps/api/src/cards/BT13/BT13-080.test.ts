import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { definitionOf } from "../../engine/cards/cardData.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-080.js";

describe("BT13-080 ProtoGizmon", () => {
  it("reduces its play cost by deleting a level 2 Digimon in the breeding area", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
    });
    if (replacement?.kind !== "Replacement") throw new Error("Expected play replacement action");
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 2,
      cost: {
        kind: "deleteOwn",
        target: {
          filter: { controller: "mine", kind: ["Digimon", "DigiEgg"], zone: "breeding", levels: [2] },
          count: 1,
        },
      },
    });
  });

  it("draws then trashes on play and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "permanent",
    });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: AT", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "return",
        to: "deckBottom",
        orderReturnedCards: true,
        target: {
          filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 2,
        },
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "nameExact", tokens: ["Gizmon: AT"] }],
            },
            count: 1,
          },
          payCost: false,
        },
      ],
    });
    expect(action?.kind).toBe("CostGatedBlock");
    if (action?.kind !== "CostGatedBlock") throw new Error("Expected CostGatedBlock action");
    const play = action.actions[0];
    expect(play?.kind).toBe("PlayWithoutCost");
    if (play?.kind !== "PlayWithoutCost") throw new Error("Expected PlayWithoutCost action");
    const atReference = play.target.filter.nameOrTrait?.[0];
    if (atReference === undefined) throw new Error("Expected Gizmon: AT name reference");
    expect(matchNameOrTrait(definitionOf("BT13-083"), atReference)).toBe(true);
    expect(matchNameOrTrait(definitionOf("BT13-086"), atReference)).toBe(false);
  });

  it("draws one card and then trashes one card from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-080", as: "proto" }], deck: ["BT1-001"], hand: ["BT1-002"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("proto"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("reduces the hand play cost by deleting a level-2 Digi-Egg in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-080", as: "proto" }],
          breeding: { card: "BT1-001", as: "egg" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proto").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-080")).toBe(true);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it("keeps its permanent no-digivolution restriction active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-080", as: "proto" }] } });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("proto"), "digivolve")).toBe(true);
  });

  it("returns two Gizmon cards before playing Gizmon: AT from the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "proto" }],
          trash: [
            { card: "BT13-083", as: "at" },
            { card: "BT13-086", as: "xt" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("proto").topCard!.instanceId, s.inst("xt").instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("proto").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-080", "BT13-086"]),
    );
  });

  it("pays the two-Gizmon return cost even when no Gizmon: AT target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "proto" }],
          trash: [{ card: "BT13-086", as: "xt" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("proto").permanentId]);
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-080", "BT13-086"]),
    );
  });

  it("does not return the Gizmon cards when the optional return wrapper is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "proto" }],
          trash: [{ card: "BT13-086", as: "xt" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("proto").permanentId]);
    await settle();

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-080", "BT13-086"]),
    );
  });

  it("can accept the return cost and decline the nested Gizmon: AT play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "proto" }],
          trash: [
            { card: "BT13-083", as: "at" },
            { card: "BT13-086", as: "xt" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("proto").topCard!.instanceId, s.inst("xt").instanceId);
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("proto").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const wrapperDecisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: wrapperDecisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== wrapperDecisionId,
    );
    const nestedDecisionId = s.state.pendingDecision!.decisionId;
    expect(nestedDecisionId).not.toBe(wrapperDecisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nestedDecisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083")).toBe(false);
  });
});
