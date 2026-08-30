import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-066.js";

describe("BT15-066", () => {
  it("de-digivolves an opposing Digimon by two to level 3 on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
  });
  it("deletes itself to play a non-Machinedramon Dark Masters and inherits Reboot", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("restricts this Machinedramon to white evolution targets during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-066", as: "machinedramon" }],
        hand: [
          { card: "BT15-102", as: "whiteApocalymon" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.inst("whiteApocalymon").digivolveTargetPermanentIds).toContain(s.perm("machinedramon").permanentId);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(s.perm("machinedramon").permanentId);
  });

  it("unsuspends a legal inherited stack during the opponent's natural unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-102", as: "host", under: ["BT15-066"] }] },
        1: { deck: ["BT15-055"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    s.state.turnSeat = 1;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle();
  });
});
