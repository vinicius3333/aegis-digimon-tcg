import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";

for (const cards of [
  ["BT20-060", "BT22-052"],
  ["BT22-052", "BT20-060"],
]) {
  it(`Discord 1555978091187277945: gains memory for simultaneous King Drasil placement in order ${cards}`, async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: cards.map((card, i) => ({ card, as: `knight${i}` })),
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("drasil").stack.map((c) => c.cardId)).toEqual(cards);
    expect(s.state.memory).toBe(5);
    expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "gainMemory")).toHaveLength(1);
    expect(s.events.some((e) => e.kind === "memoryChanged" && e.reason === "overflow")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
}

it("Discord 1555978091187277945: playable arena resolves the logged stack order and gains 2 memory", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-bt22-leopardmon-king-drasil", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    // A level-2 breeding permanent skips Breeding automatically.
    await advance(s.engine).waitForMainPhase(0);
    const drasil = s.state.players[0]!.breeding!;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(drasil.stack.map((card) => card.cardId)).toEqual(["BT20-060", "BT22-052"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
