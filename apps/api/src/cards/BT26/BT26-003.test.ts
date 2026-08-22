import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-003.js";
import "../index.js";

describe("BT26-003 Kyaromon", () => {
  it("compiles the inherited once-per-turn opponent attack redirect with the printed cost", () => {
    const effect = compiled.effects[0]!;
    expect(effect).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks" });
    expect(effect.actions[0].actions[0]).toMatchObject({ kind: "RedirectAttack", optional: false, abortOnDecline: true });
  });

  it("trashes the bottom face-down Tamer card and redirects to Glowing Dawn", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT26-010", as: "host", under: [{ card: "BT26-003", as: "egg" }] },
        { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "bottom", faceUp: false }, { card: "BT1-010", as: "upper", faceUp: false }] },
        { card: "BT26-075", as: "redirect", dp: 12000 },
      ] },
      1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    const redirectId = s.perm("redirect").permanentId;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("bottom").instanceId));
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(true);
  });
});
