import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-038.js";

describe("EX7-038", () => {
  it("has Blocker", () =>
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));
  it("requires a level 2 NSp Digimon for the alternate evolution", () =>
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }),
    ));

  it("uses Blocker publicly and passes inherited Reboot through an evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-038", as: "blocker", dp: 5000 },
          { card: "BT1-009", under: ["EX7-038"], as: "host", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("blocker").isSuspended).toBe(true);
  });
});
