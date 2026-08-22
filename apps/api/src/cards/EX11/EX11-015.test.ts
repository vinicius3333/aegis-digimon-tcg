import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-015.js";
import "../index.js";

describe("EX11-015 Frigimon", () => {
  it("plays Suzune Kazuki for free after digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-014", as: "base" }], hand: [{ card: "EX11-015", as: "evolution" }, { card: "EX11-057", as: "suzune" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolution").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-057"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-057")).toBe(true);
  });
});
