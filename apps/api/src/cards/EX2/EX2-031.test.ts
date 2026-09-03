import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-031.js";

describe("EX2-031 Guardromon", () => {
  it("has Blocker and gives one of its Digimon +3000 DP on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-030", as: "ally" }], hand: [{ card: "EX2-031", as: "guardromon" }] } },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 4000);
    expect(s.perm("ally").currentDP).toBe(4000);
    const guardromon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX2-031")!;
    expect(observe(s.engine).hasKeyword(guardromon, "Blocker")).toBe(true);
  });

  it("keeps the +3000 DP through the opponent's turn, then expires at its end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "ally" }],
          hand: [{ card: "EX2-031", as: "guardromon" }],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 4000);
    expect(s.perm("ally").currentDP).toBe(4000);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("ally").currentDP).toBe(4000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ally").currentDP).toBe(1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
