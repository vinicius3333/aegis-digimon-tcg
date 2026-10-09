import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("GitHub #5181 and #5182 dev arena scenarios", () => {
  it("arena-issue-5182-supreme-connection-delay: Delay waits a turn, then trashes the Option to play Gigadramon for 3", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-issue-5182-supreme-connection-delay", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const player = s.state.players[0]!;
      const earlierOption = player.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-096")!;
      const earlierOptionId = earlierOption.topCard!.instanceId;
      const handOption = player.hand.find((card) => card.cardId === "BT15-096")!;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: handOption.instanceId })).toEqual({ ok: true });
      await settle(
        () =>
          player.battleArea.some((permanent) => permanent.topCard?.instanceId === handOption.instanceId) &&
          s.state.pendingDecision === undefined,
      );
      const placedThisTurn = player.battleArea.find(
        (permanent) => permanent.topCard?.instanceId === handOption.instanceId,
      )!;
      expect(observe(s.engine).activatableEffects(placedThisTurn)).toEqual([]);
      expect(s.state.memory).toBe(5);

      const [delay] = observe(s.engine).activatableEffects(earlierOption);
      expect(delay).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: earlierOptionId,
          effectKey: delay!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          player.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-062") &&
          s.state.pendingDecision === undefined,
      );

      expect(player.trash.some((card) => card.instanceId === earlierOptionId)).toBe(true);
      expect(player.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
        "BT15-056",
        "BT15-062",
        "BT15-096",
      ]);
      expect(s.state.memory).toBe(2);
      expect(s.state.phase).toBe(Phase.Main);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("arena-issue-5181-sharkmon-shellmon: Sharkmon digivolves onto Rule-[Aquatic] Shellmon for 3", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-issue-5181-sharkmon-shellmon", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const shellmon = s.state.players[0]!.battleArea[0]!;
      const sharkmon = s.state.players[0]!.hand.find((card) => card.cardId === "BT24-059")!;
      const opponentDigimon = s.state.players[1]!.battleArea[0]!;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: shellmon.permanentId,
          instanceId: sharkmon.instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => opponentDigimon.topCard?.cardId === "BT24-050" && s.state.pendingDecision === undefined);

      expect(shellmon.topCard?.instanceId).toBe(sharkmon.instanceId);
      expect(shellmon.stack.map((card) => card.cardId)).toEqual(["EX12-026"]);
      expect(s.state.memory).toBe(5);
      expect(s.state.phase).toBe(Phase.Main);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
