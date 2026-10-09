import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

describe("GitHub #5354/#5355 playable Crimson Blaze / Partition arena", () => {
  it.each([false, true])("public turn loop, Crimson Blaze=%s", async (useBlaze) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    layDevScenario("arena-crimson-partition", s.state, [RED_DECK, BLUE_DECK]);
    const holder = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "ST9-06")!;
    const materials = holder.stack.filter((c) => ["BT12-022", "BT12-050"].includes(c.cardId)).map((c) => c.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      async function play(instanceId: string) {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
        await settle();
      }
      if (useBlaze) await play("dev-crimson-blaze");
      await play("dev-crimson-monodramon");
      await settle(
        () =>
          !s.state.players[1]!.battleArea.some((p) => p.permanentId === holder.permanentId) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(
        useBlaze ? [] : [...materials].sort(),
      );
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token")).toBe(true);
      expect(
        s.events.filter(
          (event) =>
            event.kind === "cardPlayed" && event.instanceId !== undefined && materials.includes(event.instanceId),
        ),
      ).toHaveLength(useBlaze ? 0 : 2);
      expect(s.state.memory).toBe(useBlaze ? 3 : 8); // Blaze costs 5; BT1-009 costs 2.
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
