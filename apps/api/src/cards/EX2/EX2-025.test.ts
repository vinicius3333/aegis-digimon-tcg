import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-025.js";
import "./EX2-026.js";
import "./EX2-061.js";
import "../ST4/ST4-15.js";

describe("EX2-025 Terriermon", () => {
  it("gains 1 memory once when its controller plays a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-025"],
          hand: [
            { card: "EX2-061", as: "henry1" },
            { card: "EX2-061", as: "henry2" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX2-061").length === 2);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when its controller plays a non-green Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-025"], hand: [{ card: "EX2-060", as: "rika" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-060"));
    expect(s.state.memory).toBe(1);
  });

  it("gains inherited DP when an opponent's Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-025"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 7000);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
