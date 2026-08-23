import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-028.js";

describe("BT4-028 Piranimon", () => {
  it("trashes the top source of an opposing Digimon when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "host", under: ["BT4-028"] }] },
        1: {
          battleArea: [
            {
              card: "BT3-015",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT2-001", as: "top" },
              ],
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const topId = s.inst("top").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === topId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });
});
