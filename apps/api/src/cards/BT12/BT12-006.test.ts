import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-006.js";
import "../ST7/ST7-06.js";

describe("BT12-006 Monimon", () => {
  it("draws on deletion when its host has Save in its text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-006"] }], deck: ["BT1-009"] },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not draw when the deleted host has no Save text", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-006"] }], deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
