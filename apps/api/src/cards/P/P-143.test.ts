import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function fireTiming(
  s: ReturnType<typeof setupEngine>,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("P-143 [End of Your Turn][OPT] move to breeding area", () => {
  it("moves Drimogemon from the battle area to the empty breeding area on end of turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    expect(p0.breeding).toBeUndefined();

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    expect(p0.breeding).toBeDefined();
    expect(p0.breeding!.permanentId).toBe(drimogemonId);
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(false);
  });

  it("preserves digivolution cards when moving to breeding (KB Q4251)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-143", dp: 5000, as: "drimogemon", under: [{ card: "BT1-064", as: "stackCard", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const stackCardId = s.inst("stackCard").instanceId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    expect(p0.breeding!.stack.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === stackCardId)).toBe(false);
  });

  it("does NOT move when the breeding area is already occupied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }],
          breeding: { card: "BT1-001", dp: 3000, as: "breeder" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;
    const breedingBefore = s.perm("breeder").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(p0.breeding?.permanentId).toBe(breedingBefore);
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });

  it("does NOT move when it is not the owner's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });

  it("resets after a natural owner turn and can move again from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", as: "drimogemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(p0.breeding?.permanentId).toBe(s.perm("drimogemon").permanentId);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding" && p0.breeding !== undefined);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: p0.breeding!.permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding" && p0.breeding !== undefined);
    expect(p0.breeding?.permanentId).toBe(s.perm("drimogemon").permanentId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
