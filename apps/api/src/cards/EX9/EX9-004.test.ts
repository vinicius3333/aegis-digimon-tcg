import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-004.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-004", () => {
  it("encodes the inherited once-per-turn Ver.4 play memory effect", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    faceDown: true,
                    position: "bottom",
                    hostFilter: { isSelfRef: true },
                  },
                },
              },
            },
          ],
        },
      ],
    }));

  it("gains 1 memory and trashes its bottom face-down card after a real Ver.4 play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-004"] }],
          hand: [{ card: "EX9-008", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-008"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-004"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trigger when a non-Ver.4 Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-004"] }],
          hand: [{ card: "BT1-016", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-016"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-009", false],
      ["EX9-004", true],
    ]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the lowest face-down source while skipping the visible egg", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-035",
              as: "host",
              under: ["EX9-004", { card: "BT1-010", faceUp: false }, { card: "BT1-009", faceUp: false }],
            },
          ],
          hand: [{ card: "EX9-008", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["EX9-004", true],
      ["BT1-009", false],
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not gain memory when no face-down source can pay the optional cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: ["EX9-004"] }],
          hand: [{ card: "EX9-008", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-008"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("EX9-004");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-004"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows declining the optional trash-and-memory effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-004"] }],
          hand: [{ card: "EX9-008", as: "played" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-008"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-004"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("enforces Once Per Turn across two real Ver.4 plays while preserving the second source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-035",
              as: "host",
              under: ["EX9-004", { card: "BT1-010", faceUp: false }, { card: "BT1-009", faceUp: false }],
            },
          ],
          hand: [
            { card: "EX9-008", as: "first" },
            { card: "EX9-008", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX9-008").length === 1,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX9-008").length === 2,
    );

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["EX9-004", true],
      ["BT1-009", false],
    ]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets Once Per Turn at the next real owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-035",
              as: "host",
              under: ["EX9-004", { card: "BT1-010", faceUp: false }, { card: "BT1-009", faceUp: false }],
            },
          ],
          hand: [
            { card: "EX9-008", as: "first" },
            { card: "EX9-008", as: "second" },
          ],
          deck: ["BT1-048", "BT1-049", "BT1-050", "BT1-051"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX9-008").length === 1,
    );
    expect(s.state.memory).toBe(8);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX9-008").length === 2,
    );
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-004"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
