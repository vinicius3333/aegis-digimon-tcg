import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-059.js";
import "./BT8-081.js";

describe("BT8-059 Kokuwamon", () => {
  it("prevents the opponent from ignoring digivolution requirements", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }] },
      1: { battleArea: [{ card: "BT8-081", as: "fury" }], hand: [{ card: "BT7-040", as: "rasenmon" }], security: ["BT8-034"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("fury").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("fury").topCard.cardId).toBe("BT8-081");
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("rasenmon").instanceId)).toBe(true);
  });
});
