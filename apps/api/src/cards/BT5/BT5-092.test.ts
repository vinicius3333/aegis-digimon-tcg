import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT5-092.js";

describe("BT5-092 Nokia Shiramine", () => {
  it("may play an Agumon from hand without paying its memory cost", async () => {
    const s = setupEngine({ 0: { hand: [
      { card: "BT5-092", as: "source" }, { card: "BT5-007", as: "agumon" },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === agumonId));
    expect(s.state.memory).toBe(0);
  });

  it("suspends to reduce a qualifying Greymon digivolution cost by 1", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT5-092", as: "nokia" }, { card: "BT5-007", as: "base" }],
      hand: [{ card: "BT5-010", as: "greymon" }],
    } }, { autoAcceptOptional: true });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("greymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("nokia").isSuspended && s.perm("base").topCard.cardId === "BT5-010");

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT5-092", as: "securityTamer", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityTamer").instanceId;

    const resolution = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === instanceId,
    ));
    await settle();
    expect(s.decisions).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    await resolution;

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});
