import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("EX13 Wisemon Witchelny arena sequence", () => {
  it.each([
    { alternateRequirementIndex: 0, cost: 3 },
    { alternateRequirementIndex: undefined, cost: 4 },
  ])(
    "Discord 1555941341962309693 replays Nom's sequence and charges $cost",
    async ({ alternateRequirementIndex, cost }) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
      );
      layDevScenario("arena-ex13-wisemon-witchelny-cost", s.state, [BLUE_DECK, RED_DECK]);
      s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const base = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-wisemon-base")!;
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: "dev-wisemon-x" }),
      ).toEqual({ ok: true });
      await settle(
        () => base.topCard.cardId === "BT19-036" && s.state.pendingDecision === undefined && s.state.memory === 9,
      );
      expect(human.security.at(-1)?.cardId).toBe("BT18-098");
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-wisemon-new-kari" })).toEqual({ ok: true });
      await settle(
        () =>
          human.battleArea.filter(({ topCard }) => topCard.cardId === "BT8-090").length === 2 &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(5);
      const wisemon = human.hand.find(({ instanceId }) => instanceId === "dev-ex13-wisemon")!;
      expect([...wisemon.digivolveRoutes]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ permanentId: base.permanentId, alternateRequirementIndex: -1, projectedCost: 4 }),
          expect.objectContaining({ permanentId: base.permanentId, alternateRequirementIndex: 0, projectedCost: 3 }),
        ]),
      );
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: wisemon.instanceId,
          alternateRequirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => base.topCard.cardId === "EX13-034" && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(5 - cost);
      expect(base.stack.map(({ cardId }) => cardId)).toEqual(["EX13-004", "BT18-030", "BT18-036", "BT19-036"]);
      expect(observe(s.engine).hasKeyword(base, "Reboot")).toBe(true);
      expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
      expect(observe(s.engine).isRestricted(base, "cantBeDeDigivolved")).toBe(true);
    },
  );
});
