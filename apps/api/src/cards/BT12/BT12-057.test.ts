import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-057.js";

describe("BT12-057 Quartzmon", () => {
  it("suspends all other Digimon and Tamers on digivolution and gains memory per pair", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine" },
          { card: "BT1-085", as: "myTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs" },
          { card: "BT10-092", as: "theirTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("quartz"));
    expect(s.perm("quartz").isSuspended).toBe(false);
    expect(
      [s.perm("mine"), s.perm("myTamer"), s.perm("theirs"), s.perm("theirTamer")].every(
        ({ isSuspended }) => isSuspended,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("prevents every other Digimon and Tamer from unsuspending", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT10-092", as: "tamer", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId, s.perm("tamer").permanentId]);
    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("suspends an opposing permanent and trashes security per 5 suspended permanents when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-057", as: "quartz" },
            { card: "BT1-009", suspended: true },
            { card: "BT1-010", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", suspended: true },
            { card: "BT10-092", suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("quartz"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
