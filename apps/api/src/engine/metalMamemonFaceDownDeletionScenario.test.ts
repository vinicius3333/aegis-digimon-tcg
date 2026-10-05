import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("MetalMamemon face-down deletion arena scenario", () => {
  it.each([
    { faceUp: false, mixed: false },
    { faceUp: true, mixed: false },
    { faceUp: false, mixed: true },
  ])(
    "Discord 1556527556319252540: Assembly Susanoomon only triggers face-up Kokuwamon (faceUp=$faceUp, mixed=$mixed)",
    async ({ faceUp, mixed }) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderTriggers: true });
      layDevScenario("arena-ex9-metal-mamemon-face-down-deletion", s.state, [BLUE_DECK, RED_DECK]);
      s.state.players[1]!.battleArea[0]!.stack[0]!.faceUp = faceUp;
      if (mixed) {
        s.putOnBoard(1, { card: "EX9-018", under: ["EX13-046"] });
      }
      const shouldDeDigivolve = faceUp || mixed;
      const materials = s.state.players[0]!.trash.map((card) => card.instanceId);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: "dev-hidden-deletion-susanoo",
          assembly: { materialInstanceIds: materials },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await settle();

      const susanoo = s.state.players[0]!.battleArea[0]!;
      expect(susanoo.topCard.cardId).toBe(shouldDeDigivolve ? "EX12-006" : "EX12-076");
      expect(susanoo.stack).toHaveLength(shouldDeDigivolve ? 7 : 8);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX13-046"),
      ).toHaveLength(shouldDeDigivolve ? 1 : 0);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
        mixed ? ["EX13-046", "EX9-018", "EX13-046", "EX9-018"] : ["EX13-046", "EX9-018"],
      );
      expect(s.state.players[1]!.trash.every((card) => card.faceUp)).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );
});
