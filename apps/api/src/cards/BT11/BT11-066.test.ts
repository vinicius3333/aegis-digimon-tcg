import { describe, expect, it } from "vitest";
import { getCardDefinition, type Seat } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-066.js";

describe("BT11-066 Tekkamon", () => {
  it("maps catalog facts and Reboot to IR", () => {
    expect(getCardDefinition("BT11-066")).toMatchObject({
      cardId: "BT11-066",
      colors: ["Black"],
      level: 5,
      playCost: 6,
      dp: 7000,
      types: ["Machine"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Reboot" }] },
    ]);
  });

  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-066", as: "tekkamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("tekkamon"), "Reboot")).toBe(true);
  });

  it("unsuspends during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-066", as: "tekkamon", suspended: true },
          { card: "BT1-075", as: "plain", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("tekkamon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("tekkamon").permanentId);
    expect(s.perm("plain").isSuspended).toBe(true);
  });
});
