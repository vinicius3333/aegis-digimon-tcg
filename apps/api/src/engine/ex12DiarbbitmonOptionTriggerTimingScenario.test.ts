import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX12 Diarbbitmon Option trigger timing Discord arena scenario", () => {
  it("holds the bot's suspension triggers until Arts Digivolve and the turn player's effects (Discord 1555168521175048263)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: ["dev-field-0-diarb-bastemon", "dev-perm-0-diarb-bastemon"],
      },
    );
    layDevScenario("arena-ex12-diarbbitmon-option-trigger-timing", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-diarb-option", useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-052") &&
        s.state.pendingDecision === undefined,
    );

    const artsPrompt = s.decisions.findIndex(
      ({ req }) => req.kind === "selectCards" && req.promptText.includes("Arts Digivolve"),
    );
    expect(artsPrompt).toBeGreaterThan(-1);
    expect(s.decisions.slice(0, artsPrompt).some(({ req }) => req.seat === 1)).toBe(false);

    const digivolved = s.events.findIndex((event) => event.kind === "digivolved" && event.cardId === "EX12-052");
    const lastOwnWhenDigivolving = s.events.findLastIndex(
      (event) => event.kind === "effectTriggered" && event.seat === 0 && event.timing === "WhenDigivolving",
    );
    expect(digivolved).toBeGreaterThan(-1);
    expect(lastOwnWhenDigivolving).toBeGreaterThan(digivolved);
    expect(
      s.events.slice(0, lastOwnWhenDigivolving).some((event) => event.kind === "effectTriggered" && event.seat === 1),
    ).toBe(false);
    expect(bot.battleArea.map((permanent) => permanent.topCard?.cardId)).not.toContain("EX13-023");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
