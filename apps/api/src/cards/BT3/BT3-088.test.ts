import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT3-088.js";
import "./BT3-109.js";
describe("BT3-088 LadyDevimon", () => {
  it("draws two then trashes two cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base" }],
          hand: [{ card: "BT3-088", as: "evolving" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p.trash.length === 2);
    expect(p.deck).toHaveLength(0);
    expect(p.hand).toHaveLength(0);
  });
  it("deletes an opposing level 3 when its host uses an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-092", as: "host", under: ["BT3-088"] }],
          hand: [{ card: "BT3-109", as: "option" }],
        },
        1: { battleArea: [{ card: "BT3-076", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows the inherited Option-use deletion once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-092", as: "host", under: ["BT3-088"] }],
          hand: [
            { card: "BT3-109", as: "first-option" },
            { card: "BT3-109", as: "second-option" },
            { card: "BT3-109", as: "third-option" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: {
          battleArea: [
            { card: "BT3-076", as: "first" },
            { card: "BT3-076", as: "second" },
            { card: "BT3-076", as: "third" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first-option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second-option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((c) => c.cardId === "BT3-109").length === 2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third-option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
