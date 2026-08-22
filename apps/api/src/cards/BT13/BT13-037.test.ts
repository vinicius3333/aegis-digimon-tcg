import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-037.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-037 Liamon", () => {
  it("trashes the top security card for the attack debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -4000, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } } });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });

  it("trashes its controller's top security card when the attack effect resolves", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-037", as: "liamon" }], security: ["BT1-001"] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("liamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0, 3000);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
