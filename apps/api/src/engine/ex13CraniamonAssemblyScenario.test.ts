import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const MATERIALS = ["dev-craniamon-lv5", "dev-craniamon-lv4", "dev-craniamon-lv3"];

describe("EX13 Craniamon Assembly Discord arena scenario (match d64ba0e9)", () => {
  it("plays Craniamon by Assembly from black printed-Blocker Lv.5/Lv.4/Lv.3 materials", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-craniamon-assembly", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-craniamon" })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-craniamon",
        assembly: {
          materialInstanceIds: ["dev-craniamon-lv5", "dev-craniamon-lv4", "dev-craniamon-inherited-blocker"],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-craniamon",
        assembly: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-craniamon"),
    );

    const craniamon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-craniamon")!;
    expect(craniamon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([
      "dev-craniamon-blue-blocker",
      "dev-craniamon-inherited-blocker",
    ]);
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(7);
  });
});
