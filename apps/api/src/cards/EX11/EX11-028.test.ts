import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-028";

describe("EX11-028 Galemon", () => {
  it("encodes its evolution requirement and all catalog effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Galemon",
      colors: ["Green"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Bird Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            {
              kind: "Suspend",
              optional: true,
              target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Suspend",
              optional: true,
              target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
        expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
        expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" }),
      ]),
    );
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    expect(allTurns.actions[0]).toMatchObject({
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }] } } }],
    });
  });

  it("plays Shoto Kazama when an own Digimon suspends with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "EX11-062", as: "shoto" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("ally").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays Shoto through the public On Play suspension flow", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "galemon" },
            { card: "EX11-062", as: "shoto" },
          ],
          battleArea: [{ card: "BT1-009", as: "ally" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062")).toBe(true);
  });

  it("uses the public suspension watcher once per turn and resets it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "first", dp: 20000 },
            { card: "BT1-010", as: "second", dp: 20000 },
            { card: "BT1-011", as: "third", dp: 20000 },
          ],
          hand: ["EX11-062", "EX11-062"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const loop = s.engine.startTurnLoop();
    s.state.turnCount = 1;
    await advance(s.engine).waitForMainPhase(0);
    const startMemory = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062").length === 1,
    );
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX11-062")).toHaveLength(1);
    expect(s.state.memory).toBe(startMemory);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX11-062")).toHaveLength(1);
    expect(s.state.memory).toBe(startMemory);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const nextTurnMemory = s.state.memory;
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062")).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062").length === 2,
    );
    expect(s.perm("third").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX11-062")).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062")).toHaveLength(2);
    expect(s.state.memory).toBe(nextTurnMemory);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not offer Shoto after a public attack suspension with two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "attacker", dp: 20000 },
            { card: "BT1-085", as: "tamer1" },
            { card: "BT1-086", as: "tamer2" },
          ],
          hand: [{ card: "EX11-062", as: "shoto" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", suspended: true, dp: 1000 }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX11-062")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not play Shoto with two Tamers or after the once-per-turn effect is spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "ally" },
            { card: "BT1-085", as: "tamer1" },
            { card: "BT1-086", as: "tamer2" },
          ],
          hand: [{ card: "EX11-062", as: "shoto" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("ally").permanentId });
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-062");
    assertNoLoudGap(s);
  });

  it("plays Galemon publicly and suspends the opponent's Digimon for Q5825", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "galemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "theirs" }] },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;
    expect(request.options?.candidateInstanceIds).toContain(s.perm("theirs").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("theirs").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("theirs").isSuspended);

    expect(s.perm("galemon").topCard.cardId).toBe(cardId);
    expect(s.perm("galemon").isSuspended).toBe(false);
    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("suspends an opposing Digimon from the public When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: cardId, as: "galemon" }],
          deck: ["BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "theirs" }] },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const selection = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("theirs").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("theirs").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual(["BT1-067"]);
    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not play Shoto when an opponent's Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "galemon" }],
          hand: [{ card: "EX11-062", as: "shoto" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "theirs", dp: 5000 }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirs").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-062");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("gains inherited battle memory only once per turn in a real battle stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }] },
      1: {
        battleArea: [
          { card: "BT1-012", as: "firstTarget", dp: 3_000, suspended: true },
          { card: "BT1-014", as: "secondTarget", dp: 4_000, suspended: true },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    s.state.turnCount = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gains inherited battle memory after winning against a Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId], dp: 20_000 }] },
      1: { security: [{ card: "BT24-051", as: "securityDigimon" }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("resets the Shoto watcher on the next own turn through the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "ally", dp: 20_000 },
          ],
          hand: ["EX11-062", "EX11-062"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-013", "BT1-014"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const loop = s.engine.startTurnLoop();
    s.state.turnCount = 1;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062").length === 1,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-062").length === 2,
    );
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
    assertNoLoudGap(s);
  });
});
