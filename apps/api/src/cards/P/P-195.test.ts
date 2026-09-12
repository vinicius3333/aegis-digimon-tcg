import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-195.js";

describe("P-195 Inori Misono", () => {
  it("gains memory at the start of the main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("offers Elecmon play or free Aegiomon digivolution on play", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Elecmon"], match: "nameExact" }] } },
              },
            ],
            [
              {
                kind: "Digivolve",
                from: ["hand"],
                payCost: false,
                target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
                into: { nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }] },
              },
            ],
          ],
        },
      ],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains one memory at the natural start of Main only while the opponent has a Digimon", async () => {
    const withOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-195", as: "inori" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withOpponent.state.memory = 5;
    await withOpponent.ready();
    const loop = withOpponent.engine.runOneTurn();
    await advance(withOpponent.engine).waitForMainPhase(0);
    expect(withOpponent.state.memory).toBe(6);
    expect(withOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await loop;

    const withoutOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-195", as: "inori" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withoutOpponent.state.memory = 5;
    await withoutOpponent.ready();
    const noOpponentLoop = withoutOpponent.engine.runOneTurn();
    await advance(withoutOpponent.engine).waitForMainPhase(0);
    expect(withoutOpponent.state.memory).toBe(5);
    expect(withoutOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await noOpponentLoop;
  });

  it("plays the exact Elecmon for free through the first On Play choice", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-195", as: "inori" },
            { card: "BT1-028", as: "elecmon" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
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
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("inori").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("elecmon").instanceId,
        ),
    );
    expect(s.state.memory).toBe(7);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(s.perm("elecmon").topCard.instanceId).toBe(s.inst("elecmon").instanceId);
    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("elecmon").instanceId }),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves the chosen Digimon into the exact Aegiomon for free and can decline Elecmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-197", as: "parent" }],
          hand: [
            { card: "P-195", as: "inori" },
            { card: "P-194", as: "aegiomon" },
            { card: "BT1-028", as: "elecmon" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    const parentId = s.perm("parent").permanentId;
    const parentSourceId = s.inst("parent").instanceId;
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("inori").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("parent").topCard.cardId === "P-194");
    expect(s.state.memory).toBe(7);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(s.perm("parent").permanentId).toBe(parentId);
    expect(s.perm("parent").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.perm("parent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("elecmon").instanceId }),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await loop;

    const decline = setupEngine(
      {
        0: {
          hand: [
            { card: "P-195", as: "inori" },
            { card: "BT1-028", as: "elecmon" },
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
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    decline.state.memory = 10;
    await decline.ready();
    const declineLoop = decline.engine.runOneTurn();
    await advance(decline.engine).waitForMainPhase(0);
    expect(decline.engine.applyIntent(0, { type: "playCard", instanceId: decline.inst("inori").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => decline.state.pendingDecision?.kind === "optional");
    const optional = decline.state.pendingDecision!;
    expect(
      decline.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => decline.state.pendingDecision === undefined);
    expect(decline.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: decline.inst("elecmon").instanceId }),
    );
    expect(decline.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-028")).toBe(
      false,
    );
    expect(decline.state.memory).toBe(7);
    expect(decline.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(decline.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await declineLoop;
  });
});
