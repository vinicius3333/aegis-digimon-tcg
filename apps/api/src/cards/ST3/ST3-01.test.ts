import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-01.js";
import "./ST3-11.js";

describe("ST3-01 Tokomon", () => {
  it("gives its host +1000 DP when an opponent is deleted at 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", under: ["ST3-01"], as: "host" }] },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("host").currentDP === 11000);
    expect(s.perm("host").currentDP).toBe(11000);
  });

  it("activates independently for every inherited copy on the same deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-11", under: ["ST3-01"], as: "attacker" },
            { card: "ST3-09", under: ["ST3-01"], as: "otherHost" },
          ],
        },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    const attackerBase = s.perm("attacker").currentDP;
    const otherBase = s.perm("otherHost").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.perm("attacker").currentDP === attackerBase + 1000 &&
        s.perm("otherHost").currentDP === otherBase + 1000,
    );
    expect(s.perm("attacker").currentDP).toBe(attackerBase + 1000);
    expect(s.perm("otherHost").currentDP).toBe(otherBase + 1000);
  });

  it("does not trigger on effect deletion and sees an opposing Digimon played after setup", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-11", under: ["ST3-01"], as: "host" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: ["ST3-02"], hand: [{ card: "ST3-05", as: "late" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const initiallyPresent = s.state.players[1]!.battleArea[0]!;
    // The effect-deletion negative path uses the public verb and must not grant the bonus.
    await advance(s.engine).verb.deletePermanent([initiallyPresent.permanentId], "byEffect");
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
    // A newly appearing opposing Digimon must still be observed by the inherited watcher.
    await advance(s.engine).verb.playInstances([s.inst("late").instanceId]);
    const latePermanent = s.state.players[1]!.battleArea[0]!;
    await advance(s.engine).verb.suspend([latePermanent.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: latePermanent.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.length === 0 && s.perm("host").currentDP === s.perm("host").baseDP + 1000,
    );
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
