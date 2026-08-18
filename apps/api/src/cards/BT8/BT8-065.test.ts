import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-065.js";

describe("BT8-065 CatchMamemon", () => {
  it("returns Mamemon cards from hand and trash to deck top and de-digivolves after returning at least 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-061", as: "base" }], hand: [{ card: "BT8-065", as: "evolving" }, "BT3-071", "BT6-063"], trash: ["BT6-064"] }, 1: { battleArea: [{ card: "BT8-067", under: ["BT1-009", "BT1-015"], as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-065"));
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-015");
  });
});
