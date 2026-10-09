import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("GitHub #5319 playable Murasamemon/e-Pulse arenas", () => {
  it("separately reproduces BT25-041 using the Option supplied by its own security payment in a real turn", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    layDevScenario("arena-github5319-bt25-murasamemon-security-option", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5319-bt25-base",
          instanceId: "github5319-bt25-murasamemon",
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-041"),
      );
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const player = s.state.players[0]!;
      expect(player.security).toHaveLength(0);
      expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        expect.arrayContaining(["github5319-bt25-e-pulse", "github5319-bt25-liollmon"]),
      );
      expect(s.state.memory).toBe(7);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it.each([
    ["arena-github5319-murasamemon-e-pulse", true],
    ["arena-github5319-murasamemon-spent-cost", false],
  ] as const)("%s follows the real turn loop and preserves both printed costs", async (scenario, canUse) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const player = s.state.players[0]!;
      const tamer = player.battleArea.find((p) => p.permanentId === "dev-perm-0-github5319-tamer")!;
      expect(tamer.stack).toHaveLength(canUse ? 2 : 1);
      expect(tamer.stack.every((card) => !card.faceUp)).toBe(true);
      expect(s.state.memory).toBe(10);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5319-base",
          instanceId: "github5319-cougarmon",
        }),
      ).toEqual({ ok: true });
      await settle(() => player.hand.some((card) => card.instanceId === "github5319-e-pulse"));
      await drainMicrotasks();
      expect(player.security).toHaveLength(1);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5319-base",
          instanceId: "github5319-murasamemon",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST23-04"));
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(tamer.stack).toHaveLength(0);
      expect(s.state.memory).toBe(8);
      expect(player.battleArea.some((p) => p.topCard.instanceId === "github5319-e-pulse")).toBe(canUse);
      expect(player.battleArea.some((p) => p.topCard.instanceId === "github5319-liollmon")).toBe(canUse);
      expect(player.hand.some((card) => card.instanceId === "github5319-e-pulse")).toBe(!canUse);
      expect(player.trash.some((card) => card.instanceId === "github5319-liollmon")).toBe(!canUse);
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(2000);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
