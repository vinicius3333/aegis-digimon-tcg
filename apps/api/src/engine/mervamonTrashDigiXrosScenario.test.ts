import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1556119607822254110 — Mervamon trash DigiXros", () => {
  it.each(["mervamon", "ignitemon"])("plays with %s from trash through the real turn loop", async (material) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-mervamon-trash-digixros", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const materialId = `dev-trash-xros-${material}`;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      for (const materialInstanceIds of [
        ["dev-trash-xros-mervamon", "dev-trash-xros-ignitemon"],
        ["dev-trash-xros-invalid"],
      ]) {
        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: "dev-trash-xros-played",
            digiXros: { materialInstanceIds },
          }),
        ).toMatchObject({ ok: false });
      }
      expect(human.trash).toHaveLength(3);
      expect(s.state.memory).toBe(10);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: "dev-trash-xros-played",
          digiXros: { materialInstanceIds: [materialId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => human.battleArea.length === 1 && s.state.pendingDecision === undefined);
      expect(human.battleArea[0]!.topCard.cardId).toBe("BT11-086");
      expect(human.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([materialId]);
      expect(human.trash).toHaveLength(2);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
