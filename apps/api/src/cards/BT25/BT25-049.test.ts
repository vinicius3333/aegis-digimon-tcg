import { digivolutionRequirementsFor, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-049.js";

describe("BT25-049 Armalizamon", () => {
  it("suspends one opponent Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-046", as: "own" }], hand: [{ card: "BT25-049", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT25-046", as: "target" },
            { card: "BT25-046", as: "second" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("own").isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("suspends one opponent Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-046", as: "source" }], hand: [{ card: "BT25-049", as: "evolver" }] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-049" && s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("supports the printed Glowing Dawn Lv.3 alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-046", as: "source" }], hand: [{ card: "BT25-049", as: "evolver" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-049");
    expect(s.state.memory).toBe(0);
  });

  it("supports ordinary green Lv.3 evolution at cost 2 and rejects a wrong-color source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT25-047", as: "source" }], hand: [{ card: "BT25-049", as: "evolver" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("source").permanentId,
        instanceId: legal.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("source").topCard?.cardId === "BT25-049");
    expect(legal.state.memory).toBe(3);
    expect(legal.perm("source").stack.map((card) => card.cardId)).toEqual(["BT25-047"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "source" }], hand: [{ card: "BT25-049", as: "evolver" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("source").permanentId,
        instanceId: invalid.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(5);
  });

  it("may decline the optional suspension without changing the opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-049", as: "source" }] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("binds the Glowing Dawn option reduction to its once-per-turn cost", () => {
    expect(digivolutionRequirementsFor("BT25-049")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    const effect = runtimeCompiledCard("BT25-049")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          amount: 3,
          sourceFilter: { kind: ["Option"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
          cost: { kind: "trashBottomFaceDownUnderTamer" },
        },
      ],
    });
  });

  it("does not reduce without a face-down Tamer source and rejects a wrong-trait Option", async () => {
    const faceUp = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "armalizamon" },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-009", as: "faceUp", faceUp: true }] },
          ],
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT25-041", "BT1-010", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    faceUp.state.memory = 10;
    await faceUp.ready();
    expect(
      faceUp.engine.applyIntent(0, {
        type: "playCard",
        instanceId: faceUp.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      faceUp.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236"),
    );
    expect(faceUp.state.memory).toBe(7);
    expect(faceUp.perm("tamer").stack).toHaveLength(1);

    const wrongTrait = setupEngine({
      0: { battleArea: [{ card: "BT25-049", as: "armalizamon" }], hand: [{ card: "BT25-100", as: "wrong" }] },
    });
    await wrongTrait.ready();
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "playCard",
        instanceId: wrongTrait.inst("wrong").instanceId,
        useAs: "option",
      } as never),
    ).toMatchObject({ ok: false });
    expect(wrongTrait.state.memory).toBe(0);
    expect(wrongTrait.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      wrongTrait.inst("wrong").instanceId,
    );
  });

  it("does not borrow the reduction from a breeding-area or opponent-controlled Armalizamon", async () => {
    const breeding = setupEngine(
      {
        0: {
          breeding: { card: "BT25-049", as: "armalizamon" },
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT25-041", "BT1-010", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    breeding.state.memory = 10;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "playCard",
        instanceId: breeding.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      breeding.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236"),
    );
    expect(breeding.state.memory).toBe(7);

    const opponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-065", as: "green" }],
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT25-041", "BT1-010", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT25-049", as: "armalizamon" }], hand: [{ card: "BT25-090", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    opponent.state.memory = 10;
    await opponent.ready();
    expect(
      opponent.engine.applyIntent(0, {
        type: "playCard",
        instanceId: opponent.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      opponent.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236"),
    );
    expect(opponent.state.memory).toBe(7);
  });

  it("naturally reduces a Glowing Dawn Option play by trashing a Tamer source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "armalizamon" },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "P-236", as: "option" }],
          deck: [{ card: "BT25-041", as: "search" }, { card: "BT1-010" }, { card: "BT1-013" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236") &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("uses the reduction once, then pays the normal second Option cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "armalizamon" },
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "costOne", faceUp: false },
                { card: "BT1-010", as: "costTwo", faceUp: false },
              ],
            },
          ],
          hand: [
            { card: "P-236", as: "first" },
            { card: "P-236", as: "second" },
          ],
          deck: ["BT25-041", "BT1-010", "BT1-013", "BT25-041", "BT1-010", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costTwo").instanceId));
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236").length >= 2,
    );
    expect(s.state.memory).toBe(7);
    const trashedSources = s.state.players[0]!.trash.map((card) => card.instanceId).filter((id) =>
      [s.inst("costOne").instanceId, s.inst("costTwo").instanceId].includes(id),
    );
    expect(trashedSources).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(1);
  });

  it("preserves the once-per-turn reduction after refusal, then suppresses a third same-turn reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "armalizamon" },
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "costOne", faceUp: false },
                { card: "BT1-010", as: "costTwo", faceUp: false },
                { card: "BT1-013", as: "costThree", faceUp: false },
                { card: "BT1-014", as: "costFour", faceUp: false },
              ],
            },
          ],
          hand: [
            { card: "P-236", as: "first" },
            { card: "P-236", as: "second" },
            { card: "P-236", as: "third" },
            { card: "P-236", as: "fourth" },
            { card: "AD1-001", as: "keepMainOpen" },
          ],
          deck: Array.from({ length: 15 }, () => "AD1-001"),
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-013", "BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    const thirdId = s.inst("third").instanceId;
    const fourthId = s.inst("fourth").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const refusal = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236").length >= 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.instanceId === firstId)),
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("tamer").stack).toHaveLength(4);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const acceptance = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: acceptance.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236").length >= 2 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costThree").instanceId) &&
        s.state.players[0]!.battleArea.some((permanent) =>
          permanent.stack.some((card) => card.instanceId === secondId),
        ),
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("tamer").stack).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-236").length >= 3 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.instanceId === thirdId)),
    );
    expect(s.state.memory).toBe(4);
    expect(s.perm("tamer").stack).toHaveLength(3);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 4;
    const nextOwnTurn = s.engine.runOneTurn();
    for (let tick = 0; tick < 100 && s.state.phase !== Phase.Main; tick += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fourthId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const resetAcceptance = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetAcceptance.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("executes inherited Piercing from a legal Glowing Dawn stack after a battle win", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-057", as: "attacker", under: ["BT25-049"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true }], security: ["BT1-010", "BT1-013"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const victimId = s.perm("victim").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
  });

  it("does not check security when the inherited Piercing attacker loses", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-057", as: "attacker", under: ["BT25-049"], dp: 1000 }] },
      1: { battleArea: [{ card: "BT25-041", as: "winner", suspended: true, dp: 12000 }], security: ["BT1-010"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const winnerId = s.perm("winner").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: winnerId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });
});
