import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-210.js";

describe("P-210 Hiroko Sagisaka", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("may return a TS Digimon from your trash on play", () => {
    expect(runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-210 engine behavior", () => {
  it("gains one memory at natural Main start only with an opposing Digimon", async () => {
    const withOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-210", as: "hiroko" }],
          hand: [{ card: "BT1-009", as: "playable" }],
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
    withOpponent.state.memory = 5;
    await withOpponent.ready();
    const withOpponentTurn = withOpponent.engine.runOneTurn();
    await advance(withOpponent.engine).waitForMainPhase(0);
    expect(withOpponent.state.memory).toBe(6);
    expect(withOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await withOpponentTurn;

    const withoutOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-210", as: "hiroko" }],
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
    const withoutOpponentTurn = withoutOpponent.engine.runOneTurn();
    await advance(withoutOpponent.engine).waitForMainPhase(0);
    expect(withoutOpponent.state.memory).toBe(5);
    expect(withoutOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await withoutOpponentTurn;
  });

  it("plays for its printed cost and may return exactly one TS Digimon from trash", async () => {
    const returned = setupEngine(
      {
        0: {
          hand: [
            { card: "P-210", as: "hiroko" },
            { card: "BT1-009", as: "playable" },
          ],
          trash: [{ card: "P-197", as: "tsTrash" }],
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
    returned.state.memory = 10;
    await returned.ready();
    const returnedLoop = returned.engine.runOneTurn();
    await advance(returned.engine).waitForMainPhase(0);
    expect(
      returned.engine.applyIntent(0, { type: "playCard", instanceId: returned.inst("hiroko").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => returned.state.pendingDecision === undefined && returned.state.players[0]!.trash.length === 0);
    expect(returned.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(returned.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: returned.inst("tsTrash").instanceId }),
    );
    expect(returned.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await returnedLoop;

    const declined = setupEngine(
      {
        0: {
          hand: [
            { card: "P-210", as: "hiroko" },
            { card: "BT1-009", as: "playable" },
          ],
          trash: [{ card: "P-197", as: "tsTrash" }],
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
    declined.state.memory = 10;
    await declined.ready();
    const declinedLoop = declined.engine.runOneTurn();
    await advance(declined.engine).waitForMainPhase(0);
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("hiroko").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    const optional = declined.state.pendingDecision!;
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: declined.inst("tsTrash").instanceId }),
    );
    expect(declined.state.memory).toBe(7);
    expect(declined.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await declinedLoop;
  });
});
