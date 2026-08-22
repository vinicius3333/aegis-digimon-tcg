import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-050.js";

describe("BT14-050", () => {
  it("prevents an opposing Digimon from unsuspending through the opponent's turn end on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent" } } });
  });

  it("keeps the opposing Digimon suspended through its next unsuspend phase", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-050", as: "piximon" }] }, 1: { battleArea: [{ card: "BT14-042", as: "target", suspended: true }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piximon").instanceId })).toEqual({ ok: true });
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT14-042")?.isSuspended).toBe(true);
  });
});
