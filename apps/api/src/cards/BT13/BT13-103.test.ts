import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-103.js";
import "./BT13-088.js";
import "./BT13-083.js";
import "./BT13-091.js";
import "./BT13-088.js";
import "../ST1/ST1-10.js";

describe("BT13-103 Akihiro Kurata", () => {
  it("reduces a Belphemon play by deleting a Gizmon Digimon for its play cost", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
    });
    if (replacement?.kind !== "Replacement") throw new Error("Expected Replacement action");
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "play",
      dynamicFrom: "deletedDigimonPlayCost",
      cost: {
        kind: "deleteOwn",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 1,
        },
      },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("draws and trashes, then optionally places this Tamer under a Belphemon to delete an opposing level 6", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions?.slice(0, 2)).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
    expect(effect?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [6] }, count: 1 },
      cost: {
        kind: "place",
        targetIsPermanent: true,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
        underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("declines placement after drawing and trashing, then resets and places itself to delete a level 6", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-088", as: "sleep" },
            { card: "BT13-103", as: "akihiro" },
          ],
          hand: [
            { card: "BT1-009", as: "discardFirst" },
            { card: "BT1-009", as: "discardNext" },
          ],
          security: Array.from({ length: 6 }, (_, index) => ({ card: "BT1-010", as: `ownSecurity${index + 1}` })),
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `ownDraw${index + 1}` })),
        },
        1: {
          battleArea: [{ card: "ST1-10", as: "phoenix" }],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `opponentDeck${index + 1}` })),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const akihiroId = s.perm("akihiro").topCard!.instanceId;
    const sleepId = s.perm("sleep").topCard!.instanceId;
    const sleepPermanentId = s.perm("sleep").permanentId;
    const firstDiscardId = s.inst("discardFirst").instanceId;
    const nextDiscardId = s.inst("discardNext").instanceId;
    const firstDrawId = s.inst("ownDraw1").instanceId;
    const nextDrawId = s.inst("ownDraw3").instanceId;
    const phoenixId = s.perm("phoenix").topCard!.instanceId;
    preferred.push(firstDiscardId);
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle();
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstKurataDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstKurataDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firstOpponentTurn;
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(firstDrawId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(firstDiscardId);
    expect(s.perm("akihiro").topCard!.instanceId).toBe(akihiroId);
    expect(s.perm("phoenix").topCard!.instanceId).toBe(phoenixId);

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    preferred.splice(0, preferred.length, nextDiscardId);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const nextDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nextDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await nextOpponentTurn;
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(nextDrawId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(nextDiscardId);
    expect(s.perm("sleep").topCard!.instanceId).toBe(sleepId);
    expect(s.perm("sleep").permanentId).toBe(sleepPermanentId);
    expect(s.perm("sleep").stack[0]?.instanceId).toBe(akihiroId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard!.instanceId === akihiroId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(phoenixId);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("naturally replaces a Belphemon play by deleting a Gizmon and reducing its play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-103", as: "akihiro" },
            { card: "BT13-083", as: "gizmon" },
          ],
          hand: [{ card: "BT13-091", as: "belphemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("belphemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-091"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-091")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083")).toBe(false);
  });
});
