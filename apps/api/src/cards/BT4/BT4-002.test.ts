import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-002.js";

describe("BT4-002 Bukamon", () => {
  it("trashes the bottom source of an opposing level 4 or lower Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-025", as: "host", under: ["BT4-002"] }] },
        1: {
          battleArea: [{ card: "BT1-019", as: "target", under: [{ card: "BT1-010", as: "bottom" }] }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId),
      5000,
    );

    expect(s.perm("target").stack).toHaveLength(0);
  });
});
