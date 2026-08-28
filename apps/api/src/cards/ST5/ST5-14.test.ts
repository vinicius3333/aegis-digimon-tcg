import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-03.js";
import "./ST5-14.js";

describe("ST5-14 Tai Kamiya", () => {
  it("retains full IR coverage for the blocker watcher and security play", () => {
    expect(runtimeCompiledCard("ST5-14")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends to unsuspend a Digimon after using Blocker", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-14", as: "tai" },
            { card: "ST5-03", as: "blocker" },
            { card: "ST5-08", as: "other", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "ST5-08", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("other").permanentId, s.perm("other").topCard.instanceId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tai").isSuspended && !s.perm("other").isSuspended);
    expect(s.perm("other").isSuspended).toBe(false);
  });
  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST5-14", as: "tai", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tai"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tai").instanceId)).toBe(true);
  });
});
