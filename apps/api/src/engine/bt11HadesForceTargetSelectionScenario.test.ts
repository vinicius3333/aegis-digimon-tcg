import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each([
  { choice: "Hexeblaumon", ids: ["dev-perm-1-hades-hexeblau"], survivors: ["BT4-093", "EX4-015"] },
  { choice: "two cheap targets", ids: ["dev-perm-1-hades-tamer", "dev-perm-1-hades-rookie"], survivors: ["EX7-023"] },
  { choice: "nothing", ids: [], survivors: ["BT4-093", "EX4-015", "EX7-023"] },
  {
    choice: "illegal over-budget response",
    ids: ["dev-perm-1-hades-hexeblau", "dev-perm-1-hades-tamer"],
    survivors: ["BT4-093", "EX4-015", "EX7-023"],
  },
])(
  "Discord 1556322403456520223 / 1556323133361750088: selects $choice with a 12-cost budget",
  async ({ ids, survivors }) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt11-hades-force-target-selection", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-hades-option" })).toEqual({ ok: true });
      await settle(() =>
        s.decisions.some(({ req }) => req.kind === "chooseTargets" && req.options?.maxTotalPlayCost === 12),
      );
      const { seat, req: selection } = s.decisions.find(
        ({ req }) => req.kind === "chooseTargets" && req.options?.maxTotalPlayCost === 12,
      )!;
      expect(selection.options).toMatchObject({ min: 0, max: 3, maxTotalPlayCost: 12, targetFate: "delete" });
      expect(selection.options?.candidateInstanceIds).toEqual(
        expect.arrayContaining(["dev-perm-1-hades-tamer", "dev-perm-1-hades-rookie", "dev-perm-1-hades-hexeblau"]),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(3);
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "chooseTargets", instanceIds: ids },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
      const attack = s.decisions.find(({ req }) => req.kind === "optional")!;
      expect(
        s.engine.applyIntent(attack.seat, {
          type: "respondDecision",
          decisionId: attack.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.trash.some((card) => card.instanceId === "dev-hades-option"),
      );
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(survivors);
      expect(s.state.memory).toBe(5);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
