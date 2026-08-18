import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-092.js";

describe("BT9-092 Cool Boy", () => {
  it("adds an X Antibody Digimon and X Antibody Option from three revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-092", as: "source" }], deck: [
      { card: "BT9-062", as: "digimon" }, { card: "BT9-109", as: "option" }, "BT9-060",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("digimon").instanceId, s.inst("option").instanceId];
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });

  it("suspends, gains memory, and draws after a same-level X Antibody digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-092", as: "coolBoy" }, { card: "BT5-007", as: "agumon" }],
          hand: [{ card: "BT9-008", as: "agumonX" }],
          deck: [{ card: "BT1-001", as: "evolutionDraw" }, { card: "BT1-002", as: "coolBoyDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("agumonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("coolBoyDraw").instanceId));

    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("does not trigger for an X Antibody Digimon whose level increased", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-092", as: "coolBoy" }, { card: "BT5-007", as: "agumon" }],
          hand: [{ card: "BT9-011", as: "growlmonX" }],
          deck: [{ card: "BT1-001", as: "evolutionDraw" }, { card: "BT1-002", as: "untouched" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("growlmonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("untouched").instanceId)).toBe(true);
  });

  it("draws nothing when suspending Cool Boy is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-092", as: "coolBoy" }, { card: "BT5-007", as: "agumon" }],
          hand: [{ card: "BT9-008", as: "agumonX" }],
          deck: [{ card: "BT1-001", as: "evolutionDraw" }, { card: "BT1-002", as: "untouched" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("agumonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("untouched").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
