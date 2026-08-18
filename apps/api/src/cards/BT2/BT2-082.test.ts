import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-082.js";

describe("BT2-082 Diaboromon", () => {
  it("plays a Diaboromon Token when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-082", as: "diaboromon" }] } }, { autoAcceptOptional: true });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("diaboromon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId.includes("TOKEN"))).toBe(true);
  });

  it("may delete another Diaboromon to survive deletion in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-082", as: "protected", suspended: true }, { card: "BT5-084", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    const costId = s.perm("cost").permanentId;
    await advance(s.engine).recompute();
    expect(advance(s.engine).ledgers.subTriggers.replacementsFor("wouldBeDeleted")).toHaveLength(1);

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some((p) => p.permanentId === costId) &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-084")).toBe(true);
  });
});
