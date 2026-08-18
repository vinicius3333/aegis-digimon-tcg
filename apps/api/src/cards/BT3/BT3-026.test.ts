import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-026.js";

describe("BT3-026 MagnaAngemon", () => {
  it("trashes the bottom digivolution card of an opposing Digimon when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-029", as: "host", under: ["BT3-026"] }] }, 1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }], security: ["BT1-011"] } }, { autoSelectCards: true });
    const sourceId = s.perm("target").stack[0]!.instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId), 5000);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
  });
});
