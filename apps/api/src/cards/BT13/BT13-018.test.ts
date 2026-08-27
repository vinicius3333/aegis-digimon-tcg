import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-018.js";

describe("BT13-018 ShineGreymon", () => {
  it("at Start of Main makes Marcus a 3000 DP Blocker Digimon that cannot digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shine"));
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("when digivolving from RizeGreymon for 3 grants the same Marcus effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-018", as: "shine" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rize").permanentId,
        instanceId: s.inst("shine").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("once per turn gives one opposing Digimon -6000 DP when an allied red/yellow Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "first" },
            { card: "BT1-021", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea.map((p) => p.currentDP).sort()).toEqual([1000, 7000]);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea.map((p) => p.currentDP).sort()).toEqual([1000, 7000]);
  });

  it("does not reduce DP when a blue-only Tamer suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "BT13-097", as: "blueTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-021", as: "target" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("blueTamer").permanentId,
    });

    expect(s.perm("target").currentDP).toBe(7000);
  });
});
