import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine } from "./testkit/harness.js";

describe("recent player-report arena scenarios", () => {
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

  it("stages #4893 with a projected cost-4 special digivolution route", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-issue-4893-seiten-evo-cost", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const result = s.state.players[0]!.hand.find(({ cardId }) => cardId === "EX12-048");
    expect(result?.digivolveRoutes.map(({ projectedCost }) => projectedCost)).toContain(4);
  });
});
