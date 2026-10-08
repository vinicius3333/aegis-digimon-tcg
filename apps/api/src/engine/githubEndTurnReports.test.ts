import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("GitHub end-of-turn reports on 6726bb561", () => {
  it("#5302: security-check digivolution cannot revive Kunlun after the pre-counter window closes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-104", as: "kunlun" },
            { card: "EX12-046", as: "shishimamon", under: ["EX12-004"] },
          ],
          hand: ["EX12-065", { card: "EX12-070", as: "arrival" }, "EX12-063"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
      const evolved = s.events.findIndex((event) => event.kind === "digivolved" && event.cardId === "EX12-065");
      const checked = s.events.findIndex((event) => event.kind === "securityRevealed");
      expect(checked).toBeGreaterThanOrEqual(0);
      expect(evolved).toBeGreaterThan(checked);
      expect(s.perm("kunlun").isSuspended).toBe(false);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("arrival").instanceId)).toBe(true);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX12-070"),
      ).toHaveLength(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it.each([true, false])(
    "#5305: Gravity Crush and Dan and Kanan respect the chosen order (memory first=%s)",
    async (memoryFirst) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT24-085", as: "dan" },
              { card: "BT26-103", as: "wrath" },
            ],
            hand: [
              { card: "BT1-090", as: "gravity" },
              { card: "BT25-075", as: "vulcanus" },
              { card: "BT25-102", as: "factorial" },
              { card: "BT25-020", as: "mars" },
            ],
            deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
            security: ["BT1-009", "BT1-010"],
          },
          1: { battleArea: ["BT1-009", "BT1-010"], deck: ["BT1-009"], security: ["BT1-009"] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          autoOrderTriggers: false,
          declinePrompts: ["Attack", "attack", "Battle", "battle"],
        },
      );
      await s.ready();
      s.state.memory = 3;
      let finished = false;
      const turn = s.engine.runOneTurn().then(() => {
        finished = true;
      });
      try {
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(4);
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gravity").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.memory === 6 && s.state.pendingDecision === undefined);
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcanus").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => finished || s.state.pendingDecision?.kind === "orderTriggers");
        expect(s.state.pendingDecision?.kind).toBe("orderTriggers");
        expect(s.state.memory).toBe(-1);
        const request = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
        const lossIndex = request.options!.triggerDescriptions!.findIndex((description) =>
          description.includes("lose 2 memory"),
        );
        expect(lossIndex).toBeGreaterThanOrEqual(0);
        expect(request.options!.triggerCardIds).toContain("BT24-085");
        const danIndex = request.options!.triggerCardIds!.indexOf("BT24-085");
        const firstIndex = memoryFirst ? lossIndex : danIndex;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response: { kind: "orderTriggers", order: [request.options!.triggerKeys![firstIndex]!] },
          }),
        ).toEqual({ ok: true });
        for (let remaining = 0; remaining < 10; remaining += 1) {
          if (finished) break;
          await settle(() => finished || s.state.pendingDecision?.kind === "orderTriggers");
          if (finished) break;
          const next = s.state.pendingDecision!;
          const keys = (JSON.parse(next.payloadJson) as { triggerKeys: string[] }).triggerKeys;
          expect(
            s.engine.applyIntent(next.seat, {
              type: "respondDecision",
              decisionId: next.decisionId,
              response: { kind: "orderTriggers", order: keys.slice(0, 1) },
            }),
          ).toEqual({ ok: true });
        }
        expect(finished).toBe(true);
        await turn;
        expect(s.perm("dan").isSuspended).toBe(true);
        expect(
          s.state.players[0]!.security.some(
            (card) => card.instanceId === s.inst("factorial").instanceId && card.faceUp,
          ),
        ).toBe(memoryFirst);
        const mars = s.state.players[0]!.battleArea.find(
          (permanent) => permanent.topCard.instanceId === s.inst("mars").instanceId,
        );
        expect(mars !== undefined).toBe(memoryFirst);
        expect(mars === undefined ? false : observe(s.engine).hasKeyword(mars, "Blocker")).toBe(memoryFirst);
        expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("factorial").instanceId)).toBe(
          !memoryFirst,
        );
        expect(s.state.memory).toBe(memoryFirst ? -7 : -3);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    },
  );

  it.each([false, true])(
    "#5315: Wrath Mode over Junomon is borrowable only with an unused recovery budget (spent=%s)",
    async (spent) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT24-102", as: "homeros" },
              spent ? { card: "BT25-044", as: "base" } : { card: "BT26-103", as: "base", under: ["BT25-044"] },
            ],
            hand: spent ? [{ card: "BT26-103", as: "wrath" }] : [],
            security: ["BT1-009", "BT1-010"],
            deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          },
          1: { deck: ["BT1-009"], security: ["BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      await s.ready();
      s.state.memory = spent ? 3 : 0;
      const turn = s.engine.runOneTurn();
      try {
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(spent ? 4 : 1);
        expect(s.perm("homeros").isSuspended).toBe(false);
        expect(
          s.engine.applyIntent(
            0,
            spent
              ? {
                  type: "digivolve",
                  permanentId: s.perm("base").permanentId,
                  instanceId: s.inst("wrath").instanceId,
                }
              : { type: "endPhase" },
          ),
        ).toEqual({ ok: true });
        await turn;
        expect(s.state.players[0]!.security).toHaveLength(3);
        const recoveries = s.events.filter(
          (event) =>
            event.kind === "effectTriggered" && event.sourceCardId === "BT26-103" && event.timing === "WhenDigivolving",
        );
        expect(recoveries).toHaveLength(1);
        expect(s.perm("homeros").isSuspended).toBe(true);
        expect(s.state.pendingDecision).toBeUndefined();
        expect(s.perm("base").topCard.cardId).toBe("BT26-103");
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    },
  );
});
