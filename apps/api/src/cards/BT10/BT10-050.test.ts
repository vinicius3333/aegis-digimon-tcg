import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-050.js";

describe("BT10-050 WezenGammamon", () => {
  it("has Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-050", as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("digivolves from Gammamon for the alternate cost of 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-008", as: "gammamon" }],
        hand: [{ card: "BT10-050", as: "wezen" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gammamon").permanentId,
        instanceId: s.inst("wezen").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard.cardId === "BT10-050");

    expect(s.state.memory).toBe(0);
    expect(s.perm("gammamon").stack.map(({ cardId }) => cardId)).toEqual(["BT8-008"]);
    assertNoLoudGap(s);
  });

  it("performs a security check after deleting a Digimon in battle with Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-050", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT8-008", as: "defender", suspended: true }],
        security: ["BT1-009"],
      },
    });
    s.state.phase = Phase.Main;
    s.state.memory = 0;
    s.perm("attacker").canAttackPlayer = true;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId) &&
        s.state.players[1]!.security.length === 0 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
