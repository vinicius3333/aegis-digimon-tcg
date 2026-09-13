import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./P-200.js";

describe("P-200 Kanan Yuki", () => {
  it("suspends one opponent Digimon at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "memoryAtMost", value: 4 },
        },
      ],
    });
  });

  it("reduces your TS Digimon digivolution by 1 by suspending this Tamer", () => {
    expect(runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          cost: { kind: "suspend", target: { isSelf: true } },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("suspends an opposing Digimon at the natural four-memory boundary and leaves it at five", async () => {
    const atBoundary = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-200", as: "kanan" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    atBoundary.state.memory = 4;
    await atBoundary.ready();
    const boundaryTurn = atBoundary.engine.runOneTurn();
    await advance(atBoundary.engine).waitForMainPhase(0);
    expect(atBoundary.perm("target").isSuspended).toBe(true);
    expect(atBoundary.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await boundaryTurn;

    const aboveBoundary = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-200", as: "kanan" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    aboveBoundary.state.memory = 5;
    await aboveBoundary.ready();
    const aboveTurn = aboveBoundary.engine.runOneTurn();
    await advance(aboveBoundary.engine).waitForMainPhase(0);
    expect(aboveBoundary.perm("target").isSuspended).toBe(false);
    expect(aboveBoundary.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await aboveTurn;
  });

  it("plays for its printed cost and keeps the exact permanent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-200", as: "kanan" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("kanan").instanceId;
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(s.perm("kanan").topCard.instanceId).toBe(optionId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
  });

  it("reduces an eligible TS digivolution by suspending itself and keeps an ordinary parent cost", async () => {
    const reduced = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-200", as: "kanan" },
            { card: "BT1-045", as: "parent" },
          ],
          hand: [
            { card: "P-194", as: "aegiomon" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    reduced.state.memory = 3;
    await reduced.ready();
    const reducedPermanentId = reduced.perm("parent").permanentId;
    const reducedSourceId = reduced.inst("parent").instanceId;
    const reducedLoop = reduced.engine.runOneTurn();
    await advance(reduced.engine).waitForMainPhase(0);
    expect(
      reduced.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: reducedPermanentId,
        instanceId: reduced.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => reduced.perm("parent").topCard.cardId === "P-194" && reduced.state.pendingDecision === undefined,
    );
    expect(reduced.events).toContainEqual({ kind: "memoryChanged", from: 3, to: 2, reason: "digivolve" });
    expect(reduced.perm("parent").permanentId).toBe(reducedPermanentId);
    expect(reduced.perm("parent").topCard.instanceId).toBe(reduced.inst("aegiomon").instanceId);
    expect(reduced.perm("parent").stack.map((card) => card.instanceId)).toEqual([reducedSourceId]);
    expect(reduced.perm("kanan").isSuspended).toBe(true);
    expect(reduced.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reducedLoop;

    const ordinary = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-200", as: "kanan" },
            { card: "BT1-045", as: "parent" },
          ],
          hand: [
            { card: "BT1-051", as: "ordinary" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ordinary.state.memory = 5;
    await ordinary.ready();
    const ordinaryPermanentId = ordinary.perm("parent").permanentId;
    const ordinaryLoop = ordinary.engine.runOneTurn();
    await advance(ordinary.engine).waitForMainPhase(0);
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinaryPermanentId,
        instanceId: ordinary.inst("ordinary").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => ordinary.perm("parent").topCard.cardId === "BT1-051" && ordinary.state.pendingDecision === undefined,
    );
    expect(ordinary.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 3, reason: "digivolve" });
    expect(ordinary.perm("kanan").isSuspended).toBe(false);
    expect(ordinary.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await ordinaryLoop;
  });
});
