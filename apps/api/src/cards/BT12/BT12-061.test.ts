import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-061.js";

describe("BT12-061 Ganemon", () => {
  it("digivolves for 2 from an off-color level 3 with Save text and rejects a plain near-match", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-008", as: "saveBase" }],
        hand: [{ card: "BT12-061", as: "ganemon" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 2;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("saveBase").permanentId,
        instanceId: valid.inst("ganemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("saveBase").topCard.cardId === "BT12-061");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-008"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plainBase" }], hand: [{ card: "BT12-061", as: "ganemon" }] },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("ganemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("grants inherited Reboot without immediately unsuspending its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-061"], suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("unsuspends its host during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-015", as: "host", under: ["BT12-061"], suspended: true },
          { card: "BT1-016", as: "plain", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("host").permanentId);
    expect(s.perm("plain").isSuspended).toBe(true);
  });
});
