import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-044.js";

describe("EX2-044 Beelzemon", () => {
  it("raises its deletion level by 1 for every 10 cards in trash", async () => {
    const trash = Array.from({ length: 8 }, () => "EX2-003");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-044", as: "beelzemon" }],
          deck: ["EX2-001", "EX2-002", "EX2-003"],
          trash,
        },
        1: { battleArea: [{ card: "EX2-015", as: "levelFour" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(10);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
