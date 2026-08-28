import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-057.js";
import "./EX2-014.js";

describe("EX2-057 Kenta Kitagawa", () => {
  it("may suspend when a blue Digimon is played to trash an opposing bottom source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-014", as: "blue" }] },
        1: {
          battleArea: [
            { card: "EX2-021", as: "target", under: ["EX2-003", "EX2-004"] },
            { card: "EX2-021", as: "untouched", under: ["EX2-003", "EX2-004"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("kenta").isSuspended && s.perm("target").stack.length === 1);
    expect(s.perm("kenta").isSuspended).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("untouched").stack).toHaveLength(2);
  });

  it("also trashes the bottom source of every opposing Digimon when MarineAngemon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marineAngemon" }] },
        1: {
          battleArea: [
            { card: "EX2-021", as: "first", under: ["EX2-003", "EX2-004", "EX2-005"] },
            { card: "EX2-021", as: "second", under: ["EX2-003", "EX2-004", "EX2-005"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marineAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kenta").isSuspended && s.perm("second").stack.length === 2);
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").stack).toHaveLength(2);
  });
});
