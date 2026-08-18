import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-031.js";

describe("BT5-031 MetalGarurumon", () => {
  it("bottom-decks an On Deletion Digimon and trashes its sources when Garurumon is in its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: "BT5-031", as: "evolving" }] },
      1: { deck: ["BT1-010"], battleArea: [{ card: "AD1-002", under: [{ card: "BT1-011", as: "source" }] }] },
    }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);

    expect(opponent.deck.at(-1)?.cardId).toBe("AD1-002");
    expect(opponent.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("gains 1 memory when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-031"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 1);
    expect(s.state.memory).toBe(1);
  });
});
