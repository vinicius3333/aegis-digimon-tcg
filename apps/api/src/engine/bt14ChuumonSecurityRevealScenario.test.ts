import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT14 Chuumon security reveal arena scenario", () => {
  it("Discord 1555015560587247616 reveals the Sukamon the opponent places back on security once", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt14-chuumon-security-reveal", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: "dev-chuumon-play" })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "cardRevealed") &&
        s.state.players[1]!.security[0]?.instanceId === "dev-chuumon-sukamon" &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[1]!;
    expect(player.security[0]).toMatchObject({ instanceId: "dev-chuumon-sukamon", cardId: "BT14-034" });
    expect(player.security[0]!.faceUp).not.toBe(true);
    expect(player.hand.map(({ instanceId }) => instanceId)).not.toContain("dev-chuumon-sukamon");
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual([
      expect.objectContaining({ seat: 1, cardId: "BT14-034", sourceCardId: "BT14-032" }),
    ]);
  });
});
