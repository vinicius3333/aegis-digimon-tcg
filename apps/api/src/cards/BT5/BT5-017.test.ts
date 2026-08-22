import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-017.js";

describe("BT5-017 ZeigGreymon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT5-017", as: "evolving" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("lets a Blitz host attack an opposing unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-019", as: "host", under: ["BT5-017"] }] },
      1: { battleArea: [{ card: "BT5-071", as: "unsuspended" }] },
    });
    (s.engine as any).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", EffectDuration.UntilEachTurnEnd);
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
    })).toEqual({ ok: true });
  });

  it("uses the actual digivolution-granted Blitz while the opponent has memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-017", as: "evolving" }] },
      1: { battleArea: [{ card: "BT5-071", as: "target" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  });
});
