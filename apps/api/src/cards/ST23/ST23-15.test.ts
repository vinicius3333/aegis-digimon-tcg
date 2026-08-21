import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-15.js";

describe("ST23-15 Glowing Dawn", () => {
  it("uses the Main effect to play the exact eligible BEATBREAK card and place itself in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-13", as: "waiver" }], hand: [{ card: "ST23-15", as: "option" }, { card: "ST23-13", as: "played" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const optionId = s.inst("option").instanceId;
    const playedId = s.inst("played").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === playedId) && s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === playedId && perm.topCard?.cardId === "ST23-13")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId && perm.topCard?.cardId === "ST23-15")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
  });
});
