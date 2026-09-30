import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Rainbow Lv.6 digivolve cost arena scenario", () => {
  it("digivolves Merciful Mode onto red/black WarGreymon and Susanoomon onto purple Boltmon (Discord bug 1554647960862855248)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    layDevScenario("arena-rainbow-evo-cost", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(12);

    const human = s.state.players[0]!;
    const topped = (cardId: string) => human.battleArea.some(({ topCard }) => topCard.cardId === cardId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-rainbow-wargreymon",
        instanceId: "dev-rainbow-merciful-mode",
      }),
    ).toEqual({ ok: true });
    await settle(() => topped("EX13-077") && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-rainbow-boltmon",
        instanceId: "dev-rainbow-susanoomon",
      }),
    ).toEqual({ ok: true });
    await settle(() => topped("EX12-076") && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
  });
});
