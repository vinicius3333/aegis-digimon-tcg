import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT26 Cerberusmon breeding Arts Digivolve Discord arena scenario", () => {
  it("Arts Digivolves onto the Digimon in the breeding area (Discord 1557536010517090345)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    layDevScenario("arena-bt26-cerberusmon-breeding-arts", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-cerberus-option", useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => human.breeding?.topCard?.cardId === "BT26-056" && s.state.pendingDecision === undefined);

    expect(s.decisions.some(({ req }) => req.kind === "selectCards" && req.promptText.includes("Arts Digivolve"))).toBe(
      true,
    );
    expect(human.breeding?.inBreeding).toBe(true);
    expect(human.trash.map((card) => card.cardId)).not.toContain("BT26-056");
    expect(bot.battleArea[0]?.topCard?.cardId).toBe("BT24-034");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
