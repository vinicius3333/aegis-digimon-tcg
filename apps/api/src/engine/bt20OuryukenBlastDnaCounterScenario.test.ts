import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT20 Ouryuken Blast DNA Counter arena (Discord 1556343982546755625)", () => {
  it.each(["activate", "pass"] as const)("resolves the reported Lanamon attack after choosing to %s", async (mode) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt20-ouryuken-blast-dna-counter", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const alphamon = human.battleArea[0]!;
    const lanamon = bot.battleArea[0]!;
    const humanSecurityBefore = human.security.length;
    const botSecurityBefore = bot.security.length;
    const originalSources = [...alphamon.stack, alphamon.topCard].map(({ instanceId }) => instanceId);
    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);

      const view = buildBotView(s.state, 1);
      expect(view).toBeDefined();
      const attack = {
        type: "attack" as const,
        attackerPermanentId: lanamon.permanentId,
        target: { kind: "player" as const },
      };
      expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(view!)).toEqual(attack);
      expect(s.engine.applyIntent(1, attack)).toEqual({ ok: true });
      await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));
      const opened = s.events.find((event) => event.kind === "counterWindowOpened");
      if (opened?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
      expect(opened.eligibleCounters).toHaveLength(4);
      const choice = opened.eligibleCounters.find(
        ({ instanceId, effectKey }) =>
          instanceId === "dev-ouryuken-ace-2" && effectKey.includes('"dev-ouryuken-partner-2"'),
      );
      expect(choice).toBeDefined();
      expect(
        s.engine.applyIntent(
          0,
          mode === "pass"
            ? { type: "respondCounter" }
            : { type: "respondCounter", sourceInstanceId: choice!.instanceId, effectKey: choice!.effectKey },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && s.state.pendingDecision === undefined);
      expect(s.events.filter(({ kind }) => kind === "counterResolved")).toEqual([
        expect.objectContaining({ activated: mode === "activate" }),
      ]);
      expect(human.hand.map(({ instanceId }) => instanceId)).toContain("dev-ouryuken-ace-1");
      expect(human.hand.map(({ instanceId }) => instanceId)).toContain("dev-ouryuken-partner-1");
      const activated = mode === "activate";
      const result = human.battleArea[0]!;
      expect(result.topCard.instanceId).toBe(activated ? "dev-ouryuken-ace-2" : alphamon.topCard.instanceId);
      expect(result.stack.map(({ instanceId }) => instanceId)).toEqual(
        activated ? ["dev-ouryuken-partner-2", ...originalSources] : originalSources.slice(0, -1),
      );
      const handIds = human.hand.map(({ instanceId }) => instanceId);
      expect(handIds.includes("dev-ouryuken-partner-2")).toBe(!activated);
      expect(handIds.includes("dev-ouryuken-ace-2")).toBe(!activated);
      expect(human.security).toHaveLength(humanSecurityBefore + (activated ? 1 : -1));
      expect(bot.security).toHaveLength(botSecurityBefore - (activated ? 1 : 0));
      expect(bot.battleArea.some(({ permanentId }) => permanentId === lanamon.permanentId)).toBe(false);
      expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(!activated);
      const recovered = s.events.findIndex(({ kind }) => kind === "securityRecovered");
      const deleted = s.events.findIndex(
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(lanamon.topCard.instanceId),
      );
      expect(recovered >= 0 && deleted > recovered).toBe(activated);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
