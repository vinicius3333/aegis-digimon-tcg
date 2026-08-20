import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-16.js";

describe("ST13-16 Legend-Arms Alliance", () => {
  it("plays an eligible Legend-Arms Digimon and remains in the battle area for Delay", async () => {
    const s = setupEngine({ 0: {
      battleArea: ["ST13-12"],
      hand: [{ card: "ST13-16", as: "alliance" }, { card: "ST13-04", as: "legendArm" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16")).toBe(true);
  });

  it("places itself even when the optional Digimon play is declined", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST13-12"], hand: [{ card: "ST13-16", as: "alliance" }] },
    }, { autoAcceptOptional: false });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16")).toBe(true);
  });
});
