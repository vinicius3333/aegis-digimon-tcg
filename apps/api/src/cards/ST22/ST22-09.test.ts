import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-09 High-Speed Plug-In H", () => {
  it("restricts an opposing Digimon from suspending and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST22-09", as: "option" }, "BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.inst("option").instanceId;
    const opponent = s.perm("opponent");
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponent.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === option));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === option)).toBe(true);
    expect(observe(s.engine).isRestricted(opponent, "beSuspended")).toBe(true);
  });
});
