import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-037.js";

describe("EX2-037 Reapermon", () => {
  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-037", as: "reapermon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("reapermon"), "Reboot")).toBe(true);
  });

  it("de-digivolves the opponent Digimon that became unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-037"], deck: ["BT1-001"] },
      1: {
        battleArea: [{ card: "EX2-037", as: "target", under: ["EX2-032"], suspended: true }, "EX2-032"],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
    });
    await s.ready();
    // Advance through both production turn boundaries so Reboot's active-phase
    // unsuspend naturally publishes the opponent-turn watcher.
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("de-digivolves only once when the opponent unsuspends twice in one turn", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-037"], deck: ["BT1-001"] },
      1: {
        battleArea: [{ card: "EX2-037", as: "target", under: ["EX2-032", "EX2-031"] }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
    });
    await s.ready();

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").stack).toHaveLength(1);

    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
