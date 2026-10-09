import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("#5362 live arena evolves Shellmon in breeding and battle with printed route costs", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-github5362-shellmon-ts", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const shells = human.hand.filter((c) => c.cardId === "BT24-025");
    const breeding = human.breeding!;
    const field = (id: string) => human.battleArea.find((p) => p.topCard.cardId === id)!;
    const bases = [breeding, field("BT24-033"), field("BT24-009"), field("BT1-028")];
    for (const id of ["BT1-045", "BT24-011"]) {
      expect(shells[0]!.digivolveTargetPermanentIds).not.toContain(field(id).permanentId);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: field(id).permanentId,
          instanceId: shells[0]!.instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    const costs = [2, 1, 2, 2];
    let memory = 10;
    for (const [index, base] of bases.entries()) {
      const card = shells[index]!;
      expect(card.digivolveTargetPermanentIds).toContain(base.permanentId);
      expect(
        card.digivolveRoutes.some((r) => r.permanentId === base.permanentId && r.projectedCost === costs[index]),
      ).toBe(true);
      const beforeHand = human.hand.length;
      const baseId = base.topCard.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: card.instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => base.topCard.instanceId === card.instanceId && s.state.pendingDecision === undefined);
      memory -= costs[index]!;
      expect(s.state.memory).toBe(memory);
      expect(base.stack.map((c) => c.instanceId)).toEqual([baseId]);
      expect(human.hand.length).toBe(beforeHand);
    }
    expect(human.breeding).toBe(breeding);
    expect(s.state.memory).toBe(3);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
