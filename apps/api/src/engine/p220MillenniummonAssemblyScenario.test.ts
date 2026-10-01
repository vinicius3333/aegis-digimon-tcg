import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const MATERIALS = ["dev-millenniummon-lv3", "dev-millenniummon-lv4", "dev-millenniummon-lv5"];

describe("P-220 Millenniummon Assembly Discord arena scenario", () => {
  it("plays Millenniummon by Assembly from three [Composite]/[Ver.3] Digimon of different levels", async () => {
    // Decline "you may delete 1 Digimon": with no opponent Digimon, auto-select would delete Millenniummon.
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-p220-millenniummon-assembly", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-millenniummon", assembly: { materialInstanceIds } });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-millenniummon" })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(playWith(["dev-millenniummon-lv3", "dev-millenniummon-same-level", "dev-millenniummon-lv5"])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(playWith(["dev-millenniummon-lv3", "dev-millenniummon-lv4", "dev-millenniummon-no-trait"])).toEqual({
      ok: false,
      reason: "invalid-material",
    });

    expect(playWith(MATERIALS)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-millenniummon"),
    );
    const millenniummon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === "dev-millenniummon",
    )!;
    expect(millenniummon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(8);
  });
});
