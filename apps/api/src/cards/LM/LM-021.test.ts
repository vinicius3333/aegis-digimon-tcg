import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-021.js";

describe("LM-021 Agumon - Bond of Bravery", () => {
  it("plays through the engine and deletes any selected opposing Digimon up to 14000 DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-021", as: "bond" }] },
      1: { battleArea: [{ card: "BT1-009", as: "within", dp: 14000 }, { card: "BT1-010", as: "over", dp: 14001 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
  });
});
