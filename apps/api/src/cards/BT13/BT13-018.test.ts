import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-018.js";

describe("BT13-018 ShineGreymon", () => {
  it("uses substring RizeGreymon evolution but exact Marcus Damon targets", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["RizeGreymon"], cost: 3, isAlternate: true },
    ]);
    expect(JSON.stringify(compiled)).not.toContain('"tokens":["Marcus Damon"],"match":"name"');
    expect(JSON.stringify(compiled)).toContain('"tokens":["Marcus Damon"],"match":"nameExact"');
    expect(compiled.effects[0]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[0]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
  });

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

  it("does not affect the near-name Marcus Damon & Agumon Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "AD1-021", as: "nearMarcus" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shine"));

    expect(s.perm("nearMarcus").currentDP).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("nearMarcus"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nearMarcus"), "digivolve")).toBe(false);
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
