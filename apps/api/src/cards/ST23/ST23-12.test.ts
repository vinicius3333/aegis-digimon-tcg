import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-12.js";

describe("ST23-12 Liollmon", () => {
  it("trashes the exact bottom face-down Tamer card to return a Glowing Dawn Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }], hand: [{ card: "ST23-12", as: "liollmon" }], trash: [{ card: "ST23-03", as: "returnTarget" }], deck: ["BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const underId = s.perm("tamer").stack[0]!.instanceId;
    const returnedId = s.inst("returnTarget").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === returnedId) && s.state.players[0]!.trash.some((card) => card.instanceId === underId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === returnedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
  });
});
