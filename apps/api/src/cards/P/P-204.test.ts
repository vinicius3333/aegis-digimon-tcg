import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-204.js";

describe("P-204 Release of the Sealed Knight!", () => {
  const answerOptional = async (s: ReturnType<typeof setupEngine>, prompt: string, accept: boolean) => {
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("optional");
    expect(decision?.promptText).toContain(prompt);
    expect(
      s.engine.applyIntent(decision!.seat, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
  };

  it("gates Draw 2 and placement behind trashing an X Antibody or Chronicle card", () => {
    expect(runtimeCompiledCard("P-204")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
              },
            },
          },
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("arms a reactive Delay watcher for player attacks and carries the exact evolution", () => {
    const card = runtimeCompiledCard("P-204")!;
    const delay = card.effects.find((effect) => effect.trigger === "AllTurns");
    expect(delay).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    });
    const watcher = delay?.actions?.find((action) => action.kind === "SubTrigger");
    expect(watcher).toMatchObject({
      event: "whenAttacking",
      sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
      actions: [
        {
          kind: "Digivolve",
          condition: { kind: "attackTargetsPlayer" },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    });
    const evolution = watcher?.kind === "SubTrigger" ? watcher.actions?.[0] : undefined;
    expect(evolution).toMatchObject({
      kind: "Digivolve",
      into: {
        levelComparison: { op: "lte", value: 6 },
        nameOrTrait: [
          { tokens: ["Alphamon"], match: "nameExact" },
          { tokens: ["Chronicle"], match: "trait" },
        ],
      },
    });
  });

  it("activates its Main effect from Security", () => {
    expect(runtimeCompiledCard("P-204")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("draws two after trashing an X Antibody card, pays its cost, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-204", as: "option" },
            { card: "BT9-109", as: "cost" },
          ],
          battleArea: [{ card: "BT19-065", as: "color" }],
          deck: [
            { card: "BT1-009", as: "drawOne" },
            { card: "BT1-010", as: "drawTwo" },
            ...Array.from({ length: 18 }, () => "BT1-009"),
          ],
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawOne").instanceId, s.inst("drawTwo").instanceId]),
    );
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    assertNoLoudGap(s);
  });

  it("activates its Main effect from security during a public opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-109", as: "securityCost" }],
          battleArea: [{ card: "BT19-065", as: "color" }],
          deck: [
            { card: "BT1-009", as: "securityDrawOne" },
            { card: "BT1-010", as: "securityDrawTwo" },
            ...Array.from({ length: 18 }, () => "BT1-009"),
          ],
          security: [{ card: "P-204", as: "securityOption" }, ...Array.from({ length: 4 }, () => "BT1-009")],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const optionId = s.inst("securityOption").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", revealedCardId: "P-204", resolution: "effect" }),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityCost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("securityDrawOne").instanceId, s.inst("securityDrawTwo").instanceId]),
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("offers and resolves Delay during its owner's player attack before security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-204", as: "option" },
            { card: "BT20-012", as: "host" },
          ],
          hand: [
            { card: "BT20-015", as: "chronicleEvolution" },
            { card: "BT20-021", as: "tooHigh" },
            { card: "BT20-013", as: "wrongTrait" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const hostId = s.perm("host").permanentId;
    const hostSourceId = s.perm("host").topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.events.every((event) => event.kind !== "securityChecked"),
    );
    expect(s.state.pendingDecision?.promptText).toContain("Trash this card to activate its ＜Delay＞");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").topCard.instanceId).toBe(hostSourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("chronicleEvolution").instanceId);
    expect(observe(s.engine).isAttacking()).toBe(true);
    await answerOptional(s, "Trash this card to activate its ＜Delay＞", true);
    await answerOptional(s, "Digivolve", true);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("chronicleEvolution").instanceId);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === hostSourceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chronicleEvolution").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooHigh").instanceId, s.inst("wrongTrait").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(optionId);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("offers Delay during an opponent's player attack and preserves the board on decline", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-204", as: "option" },
            { card: "BT20-012", as: "host" },
          ],
          hand: [{ card: "BT20-015", as: "chronicleEvolution" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentAttacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const hostId = s.perm("host").permanentId;
    const hostSourceId = s.perm("host").topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.events.every((event) => event.kind !== "securityChecked"),
    );
    expect(s.state.pendingDecision?.promptText).toContain("Trash this card to activate its ＜Delay＞");
    expect(observe(s.engine).isAttacking()).toBe(true);
    const memoryBeforeAttack = s.state.memory;
    await answerOptional(s, "Trash this card to activate its ＜Delay＞", false);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").topCard.instanceId).toBe(hostSourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chronicleEvolution").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(optionId);
    expect(s.state.memory).toBe(memoryBeforeAttack);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("trashes itself when Delay is accepted, even if the optional evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-204", as: "option" },
            { card: "BT20-012", as: "host" },
          ],
          hand: [
            { card: "BT20-015", as: "chronicleEvolution" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentAttacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const hostId = s.perm("host").permanentId;
    const hostSourceId = s.perm("host").topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.events.every((event) => event.kind !== "securityChecked"),
    );
    await answerOptional(s, "Trash this card to activate its ＜Delay＞", true);
    await answerOptional(s, "Digivolve", false);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.instanceId).toBe(hostSourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("chronicleEvolution").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not offer Delay on the placement turn or as an idle Main action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "host" }],
          hand: [
            { card: "P-204", as: "option" },
            { card: "BT9-109", as: "cost" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-204") &&
        s.state.pendingDecision === undefined,
    );
    const optionId = s.inst("option").instanceId;
    expect(JSON.parse(s.perm("option").activatableEffectsJson || "[]")).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(optionId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not offer Delay for an attack against a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-204", as: "option" },
          { card: "BT1-009", as: "attacker" },
        ],
        hand: [{ card: "BT1-009", as: "playable" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-009"] },
    });
    s.perm("option").placedByEffect = true;
    s.state.turnSeat = 0;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(optionId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
