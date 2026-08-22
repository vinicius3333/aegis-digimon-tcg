import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-049.js";

describe("BT14-049", () => {
  it("has Blast Digivolve and suspends then optionally returns an opposing suspended 5000-DP-or-lower Digimon to deck bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Return", to: "deckBottom", optional: true, target: { filter: { suspended: true, dp: { op: "lte", value: 5000 } } } }] });
  });

  it("suspends and bottoms a low-DP opposing Digimon on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-049", as: "lillymon" }] }, 1: { battleArea: [{ card: "BT14-042", as: "target", dp: 4000 }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lillymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT14-042")).toBe(true);
  });
});
