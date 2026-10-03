import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT2 Kurisarimon Discord 1555959036778643466 arena scenarios", () => {
  it("keeps the turn at zero memory after Diaboromon and Arata each play a token", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layDevScenario("arena-bt2-kurisarimon-repeat-memory", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-kurisarimon-host",
        instanceId: "dev-kurisarimon-diaboromon",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4 && !s.state.pendingDecision);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT5-090")!.isSuspended).toBe(true);
    expect(s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "gainMemory" ? [e.to] : []))).toEqual([
      -1, 0,
    ]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains memory twice from two separate start-of-main Diaboromon effects", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layDevScenario("arena-bt2-kurisarimon-start-main-memory", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId.includes("TOKEN"))).toHaveLength(2);
    expect(s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "gainMemory" ? [e.to] : []))).toEqual([
      4, 5,
    ]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
