import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-080.js";

describe("BT6-080 Ornismon", () => {
  it("has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-080", as: "ornismon" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("ornismon"), "SecurityAttack")).toBe(1);
  });

  it("deletes an opposing level 5 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT6-080", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT6-075", as: "target" },
            { card: "BT6-079", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !opponent.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-075"));
    expect(opponent.trash.some((card) => card.cardId === "BT6-075")).toBe(true);
    expect(opponent.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-079")).toBe(true);
  });
});
