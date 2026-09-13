import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-001 Gammamon", () => {
  it("draws when an effect places a digivolution card under its host", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "host", under: [{ card: "RB1-001" }] },
            { card: "RB1-032", as: "hiro" },
          ],
          hand: [{ card: "RB1-005", as: "gammamon" }],
          deck: ["RB1-011", "RB1-013", "BT1-009", "BT1-014"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);
    const drawnInstanceIds = s.state.players[0]!.deck.map((card) => card.instanceId);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(
      drawnInstanceIds.filter((instanceId) => s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)),
    ).toHaveLength(2);
    expect(s.perm("host").stack.some((card) => card.cardId === "RB1-005")).toBe(true);
  });

  it("does not add Gurimon's draw when the host has no Gurimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "host" },
            { card: "RB1-032", as: "hiro" },
          ],
          hand: [{ card: "RB1-005", as: "gammamon" }],
          deck: ["RB1-011", "RB1-013", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("limits Gurimon to one draw per turn across two Hiro placements and resets next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "host", under: [{ card: "RB1-001" }] },
            { card: "RB1-032", as: "hiroA" },
            { card: "RB1-032", as: "hiroB" },
          ],
          hand: ["RB1-005", "RB1-005", "RB1-005", "RB1-005"],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);
    s.state.memory = 10;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.state.players[0]!.deck).toHaveLength(9);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
    expect(s.state.players[0]!.deck).toHaveLength(5);
  });
});
