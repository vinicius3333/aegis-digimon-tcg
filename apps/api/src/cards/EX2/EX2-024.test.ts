import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-024.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";

describe("EX2-024 Sakuyamon", () => {
  it("unsuspends a Digimon and returns one Plug-In Option per Tamer when digivolving", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "base", suspended: true },
            { card: "EX2-019", as: "ally", suspended: true },
            "EX2-060",
          ],
          hand: [{ card: "EX2-024", as: "evolution" }],
          trash: [{ card: "EX2-066", as: "plugin" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        (!s.perm("ally").isSuspended || !s.perm("base").isSuspended) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId),
    );
    expect([s.perm("ally").isSuspended, s.perm("base").isSuspended]).toContain(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });

  it("returns one Plug-In per Tamer while unsuspending only one Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "base", suspended: true },
            { card: "EX2-019", as: "ally", suspended: true },
            "EX2-060",
            "EX2-061",
          ],
          hand: [{ card: "EX2-024", as: "evolution" }],
          trash: [
            { card: "EX2-066", as: "pluginA" },
            { card: "EX2-066", as: "pluginB" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.filter((card) => card.cardId === "EX2-066").length === 2,
    );
    expect([s.perm("ally").isSuspended, s.perm("base").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("pluginA").instanceId, s.inst("pluginB").instanceId]),
    );
  });

  it("triggers its Option effect after a cost-2 use and not a cheaper use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-024", as: "sakuyamon" }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          security: ["BT1-001"],
          deck: ["BT1-002"],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target", dp: 10000 }], deck: ["BT1-003"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.perm("target").currentDP).toBe(4000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
