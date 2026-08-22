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

  it("when digivolving, trashes exactly five cards and gains memory if one is Myotismon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-080", as: "base" }],
        hand: [{ card: "BT8-083", as: "source" }],
        deck: ["BT1-009", "BT8-080", "BT1-010", "BT1-011", "BT1-012"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-083"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(card => card.cardId === "BT8-080")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not resolve either On Play branch with only four Myotismon cards in trash", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT8-083", as: "source" }], trash: ["BT8-080", "BT8-080", "BT8-080", "BT8-080"] },
      1: { battleArea: [{ card: "BT8-070", as: "target" }], security: [{ card: "BT8-071", as: "securityTop" }] },
    }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-083"));
    expect(opponent.battleArea).toHaveLength(1);
    expect(opponent.security).toHaveLength(1);
  });
});
