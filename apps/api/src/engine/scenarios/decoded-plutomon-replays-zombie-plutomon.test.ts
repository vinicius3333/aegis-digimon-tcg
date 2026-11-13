import { describe, expect, it } from "vitest";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import "#api/cards/index";

function executeTurnWith(memory: number): ScenarioFixture {
  return {
    name: "execute-decode-plutomon",
    memory,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        trash: [
          { card: "BT26-079", as: "zombiePlutomon" },
          { card: "BT26-059", as: "plutomon" },
          { card: "BT26-078", as: "cherubimon" },
        ],
        hand: [
          { card: "BT1-001", as: "zombieOnPlayCost" },
          { card: "BT1-002", as: "zombieAttackCost" },
          { card: "BT1-003", as: "plutomonOnPlayCost" },
        ],
        deck: Array<string>(8).fill("BT1-009"),
        security: 3,
      },
      1: {
        deck: Array<string>(8).fill("BT1-009"),
        security: 5,
      },
    },
  };
}

async function decodePlutomonAtEndOfExecuteAttack(memory: number) {
  const s = setupScenario(executeTurnWith(memory), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
  });
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const effects = JSON.parse(s.inst("zombiePlutomon").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("zombiePlutomon").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1);
    const player = s.state.players[0]!;
    return {
      board: player.battleArea.map(({ topCard }) => topCard.cardId).sort(),
      trash: player.trash.map(({ cardId }) => cardId),
      opponentMemory: s.state.memory,
      executeDeleted: s.events.some(
        (event) => event.kind === "effectResolved" && event.effectKey.startsWith("granted/Execute deletion"),
      ),
      plutomonOnPlayResolved: s.events.some(
        (event) => event.kind === "effectResolved" && event.effectKey === "BT26-059/bt26-059-trash-play-titan",
      ),
    };
  } finally {
    await finishTurnLoop({ setup: s, loop });
  }
}

describe("Plutomon decoded at the end of a ZombiePlutomon Execute attack", () => {
  it("plays the deleted ZombiePlutomon from the trash when the reduced cost fits the memory gauge", async () => {
    const result = await decodePlutomonAtEndOfExecuteAttack(1);

    expect(result.executeDeleted).toBe(true);
    expect(result.plutomonOnPlayResolved).toBe(true);
    expect(result.board).toEqual(["BT26-059", "BT26-079"]);
    expect(result.trash).not.toContain("BT26-079");
    expect(result.opponentMemory).toBe(10);
  });

  it("cannot play ZombiePlutomon when paying its reduced cost would give the opponent more than 10 memory", async () => {
    const result = await decodePlutomonAtEndOfExecuteAttack(0);

    expect(result.executeDeleted).toBe(true);
    expect(result.plutomonOnPlayResolved).toBe(true);
    expect(result.board).toEqual(["BT26-059"]);
    expect(result.trash).toEqual(expect.arrayContaining(["BT26-079", "BT1-003"]));
    expect(result.opponentMemory).toBe(6);
  });
});
