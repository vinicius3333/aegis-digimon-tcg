import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT15 Leviamon (X Antibody) played-subject arena scenario", () => {
  it("digivolves Leviamon after its derived [On Play] deletes the played DemiDevimon (Q4735)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true });
    layDevScenario("arena-bt15-leviamon-x-played-subject-left", s.state, [BLUE_DECK, RED_DECK]);
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-leviamon-night-raid" })).toEqual({ ok: true });
    await settle(
      () =>
        bot.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-081") &&
        s.state.pendingDecision === undefined,
    );

    const demidevimonDeleted = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes("dev-leviamon-demidevimon"),
    );
    const leviamonXDigivolved = s.events.findIndex(
      (event) => event.kind === "digivolved" && event.seat === 1 && event.cardId === "BT15-081",
    );
    expect(demidevimonDeleted).toBeGreaterThan(-1);
    expect(leviamonXDigivolved).toBeGreaterThan(demidevimonDeleted);
    expect(
      bot.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-081")?.stack.map(({ cardId }) => cardId),
    ).toContain("EX5-063");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
