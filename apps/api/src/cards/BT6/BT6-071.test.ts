import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-071.js";

describe("BT6-071 Kinkakumon", () => {
  it("trashes a hand card to delete an opposing level 3 when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", under: ["BT6-071"], as: "host" }],
          hand: [{ card: "BT1-011", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
