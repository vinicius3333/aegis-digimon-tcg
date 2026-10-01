import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const MATERIALS = [
  ...["EX9-009", "EX9-010", "EX9-017", "EX9-025", "EX9-026", "EX9-028"].map((cardId) => `dev-kimeramon-${cardId}`),
  "dev-kimeramon-skullgreymon",
];

describe("EX9 Kimeramon SkullGreymon Assembly arena scenario", () => {
  it("accepts SkullGreymon as the seventh Lv.4 [DM] material", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex9-kimeramon-skullgreymon-assembly", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-kimeramon",
        assembly: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-kimeramon"),
    );
    const kimeramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-kimeramon")!;
    expect(kimeramon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(3);
  });
});
