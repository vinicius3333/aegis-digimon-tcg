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
    await settle(() => s.state.players[0]!.battleArea.length > 1);
    expect(s.state.players[0]!.battleArea.length).toBeGreaterThan(1);
  });
});
