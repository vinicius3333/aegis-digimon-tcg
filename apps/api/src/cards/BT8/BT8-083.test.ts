import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-083.js";

describe("BT8-083 MaloMyotismon", () => {
  it("with five Myotismon in trash, deletes an unsuspended Digimon and trashes opponent security", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-083", as: "source" }], trash: [
      "BT8-080", "BT8-080", "BT8-080", "BT8-080", "BT8-080",
    ] }, 1: { battleArea: [{ card: "BT8-070", as: "target" }], security: [{ card: "BT8-071", as: "securityTop" }] } }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && opponent.security.length === 0);
    expect(opponent.trash).toHaveLength(2);
  });
});
