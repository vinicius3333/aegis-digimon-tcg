import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-006.js";

describe("BT7-006 Kokomon", () => {
  it("reveals 3 and trashes a Tamer when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: ["BT7-006"], as: "host" }],
          deck: [{ card: "BT1-085", as: "tamer" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001"] },
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline the reveal without moving any cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: ["BT7-006"], as: "host" }],
          deck: [{ card: "BT1-085", as: "tamer" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("tamer").instanceId);
  });
});
