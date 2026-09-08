import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_089 } from "./BT24-089.js";
import "../index.js";

describe("BT24-089 Unique Emblem: Blazing Conductor", () => {
  it("uses a reactive Delay watcher on Owen suspension", () => {
    const yourTurn = BT24_089.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.keywords).toBeUndefined();
    expect(yourTurn?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }] },
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 3, optional: true }],
    });
  });

  it.each([
    ["Elizamon from hand", "BT24-008", "hand"],
    ["Owen Dreadnought from trash", "BT24-082", "trash"],
  ])("publicly plays the exact %s and places the Option in battle", async (_label, targetCard, zone) => {
    const board = {
      0: {
        battleArea: [{ card: "BT1-009", as: "redSource" }],
        hand: [
          { card: "BT24-089", as: "option" },
          ...(zone === "hand" ? [{ card: targetCard, as: "target" }] : []),
          { card: "BT1-009", as: "spare" },
        ],
        ...(zone === "trash" ? { trash: [{ card: targetCard, as: "target" }] } : {}),
      },
    } as BoardSpec;
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const targetId = s.inst("target").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(targetId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(optionId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(targetId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places itself when no exact-target Main play is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT24-010", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT24-089");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongName").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places itself after refusing an available exact-target Main play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("elizamon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate Delay when the Option was placed earlier in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-008", as: "base" },
            { card: "BT24-008", as: "untouched" },
          ],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-082", as: "owen" },
            { card: "BT24-012", as: "evolution" },
            { card: "BT1-013", as: "spare" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const untouchedId = s.perm("untouched").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("owen").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("owen").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.perm("untouched").topCard.instanceId).toBe(untouchedId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(optionId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(2);
  });

  it("reacts to a public Owen-triggered suspension and Delay-evolves the other host for zero", async () => {
    const preferred: string[] = [];
    const options = { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-008", as: "firstBase" },
            { card: "BT24-008", as: "secondBase" },
          ],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-082", as: "owen" },
            { card: "BT24-012", as: "firstEvolution" },
            { card: "BT24-012", as: "secondEvolution" },
            { card: "BT24-011", as: "dragonkinOnly" },
            { card: "BT23-064", as: "liberatorOnly" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [
            { card: "BT1-009", as: "naturalDraw" },
            { card: "BT1-013", as: "firstEvoDraw" },
            { card: "BT1-014", as: "secondEvoDraw" },
            { card: "BT1-015", as: "extra" },
          ],
        },
        1: { security: [{ card: "BT1-013", as: "opponentSecurity" }], deck: ["BT1-009", "BT1-010"] },
      },
      options,
    );
    const secondBaseId = s.perm("secondBase").topCard.instanceId;
    const optionId = s.inst("option").instanceId;
    preferred.push(secondBaseId, s.inst("secondEvolution").instanceId);
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("owen").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("owen").instanceId),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    options.autoDeclineOptional = false;
    const decisionOffset = s.decisions.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.slice(decisionOffset).some(({ req }) => req.kind === "optional"));
    const newOptional = () => s.decisions.slice(decisionOffset).filter(({ req }) => req.kind === "optional");
    const suspendPrompt = newOptional()[0]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => newOptional().length >= 2);
    const attackPrompt = newOptional()[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => newOptional().length >= 3);
    const delayPrompt = [...s.decisions]
      .reverse()
      .find(({ req }) => req.kind === "optional" && req.promptText?.includes("Trash this card"))!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.slice(decisionOffset).filter(({ req }) => req.kind === "optional").length >= 4);
    const evolvePrompt = [...s.decisions]
      .reverse()
      .find(({ req }) => req.kind === "optional" && req.promptText === "Digivolve")?.req;
    if (evolvePrompt === undefined || evolvePrompt.kind !== "optional")
      throw new Error("Expected Delay evolution decision");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolvePrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard.instanceId === s.inst("secondEvolution").instanceId);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("firstBase").topCard.instanceId).toBe(s.inst("firstEvolution").instanceId);
    expect(s.perm("secondBase").topCard.instanceId).toBe(s.inst("secondEvolution").instanceId);
    expect(s.perm("secondBase").stack.map((card) => card.instanceId)).toEqual([secondBaseId]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondEvolution").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("dragonkinOnly").instanceId, s.inst("liberatorOnly").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("plays an exact Elizamon or Owen and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-008", as: "elizamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-008")).toBe(true);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-089", as: "option" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-008")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
