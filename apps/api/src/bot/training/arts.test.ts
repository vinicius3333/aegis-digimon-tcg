import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import { TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";
import "../../cards/index.js";

const artsCardIds = ["ST23-09", "BT25-057", "BT26-031", "BT25-043"];
const cases = artsCardIds.flatMap((cardId) =>
  [-1, 0, 1].flatMap((hostIndex) =>
    (cardId === "BT25-057" ? [false, true] : [false]).map((attack) => ({ cardId, hostIndex, attack })),
  ),
);

describe("scoped Arts Digivolve through the asynchronous policy", () => {
  it("includes every DUAL card in both pinned training decks", () => {
    const scopedCards = new Set(
      TRAINING_DECK_VERSIONS.flatMap((version) => {
        const { deck } = trainingDeck(version);
        return [...deck.mainDeck, ...deck.eggDeck];
      }),
    );
    expect([...scopedCards].filter((cardId) => getCardDefinition(cardId)?.isDualCard).sort()).toEqual(
      [...artsCardIds].sort(),
    );
  });
  it.each(cases)(
    "uses $cardId and selects Arts host $hostIndex (attack=$attack)",
    async ({ cardId, hostIndex, attack }) => {
      const hostCard = cardId === "ST23-09" || cardId === "BT25-043" ? "BT25-041" : "BT26-026";
      const setup = setupEngine(
        {
          0: {
            battleArea: [
              { card: hostCard, as: "host-0" },
              { card: hostCard, as: "host-1" },
              { card: "EX9-046", as: "ineligible" },
            ],
            hand: [{ card: cardId, as: "dual" }],
            deck: [{ card: "EX9-048", as: "draw" }],
          },
          1: { deck: ["EX9-046"], security: ["EX9-046", "EX9-046", "EX9-046"] },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.memory = 10;
      await setup.ready();
      const dualId = setup.inst("dual").instanceId;
      const hostIds = [setup.inst("host-0").instanceId, setup.inst("host-1").instanceId];
      const invalidId = setup.inst("ineligible").instanceId;
      const artsWindows: TrainingWindow[] = [];
      const checkedBeforeArts: number[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === dualId);
        if (window.kind === "optional") return attack ? 0 : 1;
        const finish = window.actions.findIndex((action) => action.label === "Finish selection");
        if (window.request?.promptText?.includes("Arts Digivolve")) {
          artsWindows.push(window);
          checkedBeforeArts.push(setup.events.filter((event) => event.kind === "securityRevealed").length);
          if (hostIndex < 0 || window.selected.length > 0) return finish;
          return window.actions.findIndex((action) => action.sourceId === hostIds[hostIndex]);
        }
        if (window.selected.length > 0) return finish;
        return 0;
      });
      expect(setup.engine.applyIntent(0, await policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 24; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (pending === undefined) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual(
          { ok: true },
        );
        await settle();
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.events.some((event) => event.kind === "attackDeclared")).toBe(attack);
      expect(setup.state.players[1]!.security).toHaveLength(
        attack ? 1 : (cardId === "BT26-031" || cardId === "BT25-043") && hostIndex >= 0 ? 2 : 3,
      );
      expect(artsWindows.length).toBeGreaterThan(0);
      expect(new Set(artsWindows.map((window) => window.request?.decisionId)).size).toBe(1);
      expect(checkedBeforeArts.every((count) => count === 0)).toBe(true);
      const offered = artsWindows[0]!.actions.map((action) => action.sourceId);
      expect(offered).toEqual(expect.arrayContaining(hostIds));
      expect(offered).not.toContain(invalidId);
      for (const index of [0, 1]) {
        const host = setup.perm(`host-${index}`);
        expect(host.topCard.instanceId).toBe(index === hostIndex ? dualId : hostIds[index]);
        expect(host.stack.map((card) => card.instanceId)).toEqual(index === hostIndex ? [hostIds[index]] : []);
      }
      expect(setup.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(hostIndex < 0 ? [dualId] : []);
      expect(setup.state.players[0]!.hand.map((card) => card.cardId)).toEqual(hostIndex < 0 ? [] : ["EX9-048"]);
      expect(setup.state.memory).toBe(10 - getCardDefinition(cardId)!.playCost);
    },
  );
});
