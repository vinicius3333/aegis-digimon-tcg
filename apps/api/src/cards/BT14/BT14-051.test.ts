import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-051.js";

describe("BT14-051", () =>
  it("once per turn at the end of the opponent's turn reveals five and adds two green Digimon by suspending an own Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          cost: { kind: "suspend" },
          add: [{ count: 2, to: "hand", filter: { colors: ["Green"] } }],
        },
      ],
    })));

describe("BT14-051 runtime suspend cost", () => {
  it("naturally suspends before resolving at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-048", as: "base" }],
          hand: [{ card: "BT14-051", as: "okuwamon" }],
          deck: ["BT14-044", "BT14-044", "BT14-044", "BT14-082", "BT14-089"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("okuwamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-051");
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).runTurn(1);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 2);
  });

  it("stays unsuspended and adds nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-051", as: "okuwamon" }],
          deck: ["BT14-044", "BT14-044", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).runTurn(1);
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("okuwamon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
  });

  it("resets the end-of-opponent-turn reveal on the next natural opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-051", as: "okuwamon", under: ["BT14-047"] }],
          hand: [{ card: "BT1-009", as: "ownHand" }],
          deck: [
            "BT14-044",
            "BT14-045",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT14-047",
            "BT14-050",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          security: ["BT1-091", "BT1-091"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-091", "BT1-091"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;
    expect(s.perm("okuwamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT14-044", "BT14-045"]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(8);
    expect(s.state.players[0]!.deck.slice(0, 5).map(({ cardId }) => cardId)).toEqual([
      "BT14-047",
      "BT14-050",
      "BT1-009",
      "BT1-009",
      "BT1-009",
    ]);
    expect(s.state.players[0]!.deck.slice(-3).every(({ cardId }) => cardId === "BT1-009")).toBe(true);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(s.perm("okuwamon").isSuspended).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = 3;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
    expect(s.perm("okuwamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT14-044", "BT14-045", "BT14-047", "BT14-050"]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck.every(({ cardId }) => cardId === "BT1-009")).toBe(true);
  });
});
