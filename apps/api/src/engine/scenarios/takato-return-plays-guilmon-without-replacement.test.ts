import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function startMainPhase(hand: { card: string; as: string }[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX13-068", as: "takato" }],
        hand,
        trash: [{ card: "BT2-009", as: "guilmon" }],
        deck: ["BT1-011", "BT1-012", "BT1-013"],
      },
      1: { deck: ["BT1-011", "BT1-012"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 1;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  return { s, turn };
}

describe("Takato Matsuki return plays Guilmon from trash without a replacement Takato", () => {
  it("plays Guilmon from trash when no [Takato Matsuki] is in hand and no Digimon is in play", async () => {
    const { s, turn } = await startMainPhase([{ card: "BT1-009", as: "spare" }]);
    const takatoId = s.inst("takato").instanceId;
    const guilmonId = s.inst("guilmon").instanceId;
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === takatoId);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(takatoId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([guilmonId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(guilmonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays Guilmon from trash when the hand is empty", async () => {
    const { s, turn } = await startMainPhase([]);
    const guilmonId = s.inst("guilmon").instanceId;
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === s.inst("takato").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([guilmonId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
