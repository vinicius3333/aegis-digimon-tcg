import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("recent player-report arena scenarios", () => {
  it("stages Ryutaro with two consecutive qualifying digivolutions", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-ex11-ryutaro-suspended", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-010")).toHaveLength(2);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "EX11-011")).toHaveLength(2);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "EX8-016")).toHaveLength(1);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX11-009");
  });

  it("stages Rina and an unsuspended UlforceVeedramon against Rebootmon with Logimon in hand", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt11-rina-ulforce-immunity", s.state, [BLUE_DECK, RED_DECK]);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(3);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT25-060", "BT1-013"]);
    expect(human.hand.filter(({ cardId }) => cardId === "BT25-052")).toHaveLength(1);
    expect(bot.battleArea.map(({ topCard, isSuspended }) => [topCard.cardId, isSuspended])).toEqual([
      ["BT11-112", false],
      ["EX13-023", false],
    ]);
  });

  it("keeps #4888's App Fusion route when the live turn loop reaches Main", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    s.engine.stagedDecks[0] = BLUE_DECK;
    s.engine.stagedDecks[1] = RED_DECK;
    s.engine.startDevScenario("arena-issue-4888-app-fusion");

    for (let tick = 0; tick < 400 && s.state.phase !== Phase.Main; tick += 1) {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const result = s.state.players[0]!.hand.find(({ cardId }) => cardId === "EX10-017");
    expect(s.state.phase).toBe(Phase.Main);
    expect(result?.appFusionRoutes).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  });

  it("stages #4888 with a projected zero-cost App Fusion route", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4888-app-fusion", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const result = s.state.players[0]!.hand.find(({ cardId }) => cardId === "EX10-017");
    expect(result?.appFusionRoutes).toHaveLength(1);
    expect(result?.appFusionRoutes[0]?.projectedCost).toBe(0);
  });

  it("stages #4889 with the reported level-4 DNA route", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4889-weregarurumon-dna", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const result = s.state.players[0]!.hand.find(({ cardId }) => cardId === "EX12-032");
    expect(result?.dnaDigivolveRoutes).toHaveLength(1);
    expect(result?.dnaDigivolveRoutes[0]?.projectedCost).toBe(0);
  });

  it("stages the Paildramon DNA route from ExVeemon and Lighdramon", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-paildramon-dna-inheritance", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    expect(s.state.players[1]!.security[0]?.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.security).toHaveLength(5);

    const exveemon = s.state.players[0]!.hand.find(({ cardId }) => cardId === "BT12-022");
    expect(exveemon).toBeDefined();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: exveemon!.instanceId })).toEqual({ ok: true });
    await s.ready();

    const paildramon = s.state.players[0]!.hand.find(({ cardId }) => cardId === "BT12-028");
    expect(paildramon?.dnaDigivolveRoutes).toHaveLength(1);
    expect(paildramon?.dnaDigivolveRoutes[0]?.projectedCost).toBe(0);
  });

  it("stages #4890 with both reported deletions and Myotismon's legal NSo DNA line", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4890-reina-deletion", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX11-059", "EX8-060", "EX8-062", "EX12-032"]),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT2-109", "EX8-064"]),
    );
  });

  it("installs one Reina and Piedmon deletion watcher in #4890's live Main phase", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    s.engine.stagedDecks[0] = BLUE_DECK;
    s.engine.stagedDecks[1] = RED_DECK;
    s.engine.startDevScenario("arena-issue-4890-reina-deletion");

    for (let tick = 0; tick < 400 && s.state.phase !== Phase.Main; tick += 1) {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const reina = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX11-059")!;
    expect(
      s.engine.subTriggers
        .subscriptionsFor("onDeletionOf")
        .filter(({ sourcePermanentId }) => sourcePermanentId === reina.permanentId),
    ).toHaveLength(1);
    const piedmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX8-062")!;
    expect(
      s.engine.subTriggers
        .subscriptionsFor("onDeletionOf")
        .filter(({ sourcePermanentId }) => sourcePermanentId === piedmon.permanentId),
    ).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  });

  it("offers each #4890 deletion reaction exactly once after Heat Viper", async () => {
    const automation = {
      autoAcceptOptional: true,
      autoChooseOption: true,
      autoOrderCards: true,
      autoOrderTriggers: true,
      autoSelectCards: false,
      preferTriggerKeys: ["EX11-059"],
    };
    const s = setupEngine({ 0: {}, 1: {} }, automation);
    s.engine.stagedDecks[0] = BLUE_DECK;
    s.engine.stagedDecks[1] = RED_DECK;
    s.engine.startDevScenario("arena-issue-4890-reina-deletion");

    for (let tick = 0; tick < 400 && s.state.phase !== Phase.Main; tick += 1) {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const heatViper = s.state.players[0]!.hand.find(({ cardId }) => cardId === "BT2-109")!;
    const myotismon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX8-060")!;
    const opponents = s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
    if (s.state.pendingDecision?.kind === "selectCards") {
      const startOfMain = s.state.pendingDecision;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: startOfMain.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    }
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: heatViper.instanceId })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const cost = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "chooseTargets", instanceIds: [myotismon.permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== cost.decisionId,
    );
    const targets = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targets.decisionId,
        response: { kind: "chooseTargets", instanceIds: opponents },
      }),
    ).toEqual({ ok: true });

    automation.autoSelectCards = true;
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX8-064"));
    const orders = s.decisions.filter(({ req }) => req.kind === "orderTriggers").map(({ req }) => req);
    expect(orders).toHaveLength(1);
    for (const order of orders) {
      expect(order.options?.triggerCardIds?.filter((cardId) => cardId === "EX11-059") ?? []).toHaveLength(
        order.options?.triggerCardIds?.includes("EX11-059") ? 1 : 0,
      );
      expect(order.options?.triggerCardIds?.filter((cardId) => cardId === "EX8-062") ?? []).toHaveLength(
        order.options?.triggerCardIds?.includes("EX8-062") ? 1 : 0,
      );
    }
    const piedmonAnnouncements = s.events.filter(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "EX8-062",
    );
    expect(piedmonAnnouncements).toHaveLength(1);
  });

  it("stages #4891 with enough memory to play SeitenGokuumon into a DP target", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4891-seiten-on-play", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.memory).toBe(13);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-048")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-024")).toBe(true);
  });

  it("stages #4892 with Hakubamon and one legal Gokuumon DigiXros material", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4892-effect-digixros", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-043")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX12-015", "EX12-006"]),
    );
  });

  it("stages #4894 with Jesmon, an Atho, René & Por token in play, and a Sistermon in hand", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4894-jesmon-token-limit", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT23-013")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "TOKEN-AthoRenePor-Token"),
    ).toHaveLength(1);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT10-085")).toBe(true);
  });

  it("stages #4893 with a projected cost-4 special digivolution route", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4893-seiten-evo-cost", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const result = s.state.players[0]!.hand.find(({ cardId }) => cardId === "EX12-048");
    expect(result?.digivolveRoutes.map(({ projectedCost }) => projectedCost)).toContain(4);
  });
});
