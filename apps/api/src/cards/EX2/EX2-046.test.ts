import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-046.js";

describe("EX2-046 ADR-02 Searcher", () => {
  it("registers full compiled IR without residuals", () => {
    const compiled = registeredCompiledCards.get("EX2-046");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    expect(compiled?.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
        },
      ],
    });
  });
  it("costs 2 less without another Searcher and draws 1 on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX2-046", as: "searcher" }], deck: [{ card: "BT1-001", as: "drawn" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("searcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("reduces only the Searcher copy being played when two copies are in hand", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX2-046", as: "played" },
          { card: "EX2-046", as: "unplayed" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("unplayed").instanceId, s.inst("drawn").instanceId]),
    );
  });

  it("pays the full cost when another ADR-02 Searcher is already in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-046", as: "existing" }],
        hand: [{ card: "EX2-046", as: "played" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.memory).toBe(7);
  });

  it("cannot attack a player during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-046", as: "searcher" }] },
      1: { deck: ["BT1-001", "BT1-002", "BT1-003"], security: ["BT1-004"] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("searcher"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("searcher").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("gives only D-Reaper Digimon +1000 DP through its inherited Your Turn aura", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-050", as: "dReaperHost", under: ["EX2-046"] },
          { card: "EX2-019", as: "nonDReaper" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: { deck: ["BT1-004", "BT1-005", "BT1-006"] },
    });
    await s.ready();
    expect(s.perm("dReaperHost").currentDP).toBe(7_000);
    expect(s.perm("nonDReaper").currentDP).toBe(1_000);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("dReaperHost").currentDP).toBe(6_000);
    expect(s.perm("nonDReaper").currentDP).toBe(1_000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
