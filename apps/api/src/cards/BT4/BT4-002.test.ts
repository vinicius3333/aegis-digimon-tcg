import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-002.js";

describe("BT4-002 Bukamon", () => {
  it("trashes the bottom source of an opposing level 4 or lower Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-025", as: "host", under: ["BT4-002", "BT3-021"] }] },
        1: {
          battleArea: [
            {
              card: "BT1-019",
              as: "target",
              under: [{ card: "BT1-001", as: "bottom" }, { card: "BT1-010", as: "upper" }],
            },
          ],
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
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId), 5000);

    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.cardId).toBe("BT1-010");
  });

  it("does not target an opposing level 5 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-025", as: "host", under: ["BT4-002", "BT3-021"] }] },
      1: {
        battleArea: [
          {
            card: "BT1-023",
            as: "target",
            under: [{ card: "BT1-001", as: "bottom" }, "BT1-010", { card: "BT1-019", as: "upper" }],
          },
        ],
        security: ["BT1-011"],
      },
    });
    const bottomId = s.inst("bottom").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").stack.map((card) => card.instanceId)).toContain(bottomId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === bottomId)).toBe(false);
  });
});
