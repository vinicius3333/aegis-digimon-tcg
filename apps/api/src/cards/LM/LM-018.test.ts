import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-018.js";

describe("LM-018 Gyuukimon", () => {
  it("deletes an opposing level-4 Digimon and plays its token when played", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-018", as: "gyuukimon" }] },
      1: { battleArea: [{ card: "ST1-06", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token"));
    const token = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token");
    expect(token?.topCard?.cardId).toBe("TOKEN-Gyuukimon-Token");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST1-06")).toBe(true);
  });

  it("does not play the token when no eligible opposing Digimon was deleted", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "LM-018", as: "gyuukimon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
  });
});
