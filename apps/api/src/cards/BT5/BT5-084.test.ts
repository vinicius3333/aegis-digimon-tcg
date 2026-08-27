import { describe, it, expect } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-084.js";
describe("BT5-084 Diaboromon", () => {
  it("may play a white Diaboromon Token when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT5-084", as: "evolving" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId.includes("TOKEN"))!;
    expect(token.topCard.cardId).toBe("TOKEN-Diaboromon");
    expect(token.controllerSeat).toBe(0);
    expect(token.topCard.ownerSeat).toBe(0);
    expect(token.topCard.faceUp).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(requireCardDefinition(token.topCard.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      dp: 3000,
      playCost: 14,
      isToken: true,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
    });
    expect(requireCardDefinition(token.topCard.cardId).colors).toContain("White");
  });
  it("may decline the optional Token effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT5-084", as: "evolving" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
