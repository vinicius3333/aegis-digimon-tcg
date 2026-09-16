import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-004.js";

const MOTIMON = "BT15-004";
const TENTOMON = "BT1-066";
const DUMMY = "BT1-009";

function fireTiming(s: EngineSetup, timing: EffectTiming): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing);
}

describe("BT15-004 Motimon — [End of Your Turn][Inherited] Insectoid may attack", () => {
  it("registers only compiled IR for the inherited Insectoid attack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Attack",
          attackPlayer: false,
          optional: true,
          drainTimingWindowDuringAttack: true,
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("triggers an attack with an Insectoid Digimon that has BT15-004 in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", under: [MOTIMON] }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          battleArea: [{ card: DUMMY, dp: 3000, suspended: true }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.perm("tentomon").isSuspended).toBe(false);

    const timing = fireTiming(s, EffectTiming.OnEndTurn);

    await settle(() => s.perm("tentomon").isSuspended, 400);
    await timing;

    expect(s.perm("tentomon").isSuspended, "Tentomon must be suspended after its attack").toBe(true);
  });

  it("attacks through the natural end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", under: [MOTIMON] }],
          deck: [DUMMY],
        },
        1: { battleArea: [{ card: DUMMY, dp: 1000, as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("tentomon").isSuspended).toBe(true);
  });

  it("does NOT trigger when the Digimon is already suspended (KB Q2490)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", suspended: true, under: [MOTIMON] }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          battleArea: [{ card: DUMMY, dp: 3000 }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => false, 50);

    expect(s.perm("tentomon").isSuspended, "Tentomon stays suspended — attack not declared").toBe(true);
    const permanentId = s.perm("tentomon").permanentId;
    const p0 = s.state.players[0];
    expect(p0?.battleArea.some((perm) => perm.permanentId === permanentId)).toBe(true);
  });

  it("does NOT trigger when the top card is not Insectoid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DUMMY, dp: 3000, as: "nonInsectoid", under: [MOTIMON] }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          battleArea: [{ card: DUMMY, dp: 2000 }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.perm("nonInsectoid").isSuspended).toBe(false);

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => false, 50);

    expect(s.perm("nonInsectoid").isSuspended, "non-Insectoid must not be suspended").toBe(false);
  });

  it("allows only the first of two pending Motimon effects to declare an attack (KB Q2491)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TENTOMON, dp: 4000, as: "first", under: [MOTIMON] },
            { card: TENTOMON, dp: 4000, as: "second", under: [MOTIMON] },
          ],
        },
        1: {
          battleArea: [
            { card: DUMMY, dp: 1000, as: "target1", suspended: true },
            { card: DUMMY, dp: 1000, as: "target2", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEndTurn);

    expect([s.perm("first").isSuspended, s.perm("second").isSuspended].filter(Boolean)).toHaveLength(1);
  });
});
