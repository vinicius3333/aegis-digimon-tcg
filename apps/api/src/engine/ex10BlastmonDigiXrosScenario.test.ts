import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const MATERIALS = ["dev-blastmon-skullknightmon", "dev-blastmon-deadlyaxemon", "dev-blastmon-chuuchuumon"];

describe("EX10 Blastmon DigiXros Discord arena scenario", () => {
  it("Discord bug 1555207678542876682: places 3 [Bagra Army] materials and rejects a fourth", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex10-blastmon-digixros", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-blastmon",
        digiXros: { materialInstanceIds: [...MATERIALS, "dev-blastmon-damemon"] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-blastmon",
        digiXros: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === "dev-blastmon") &&
        s.state.pendingDecision === undefined,
    );

    const blastmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === "dev-blastmon")!;
    expect(blastmon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain("dev-blastmon-damemon");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
