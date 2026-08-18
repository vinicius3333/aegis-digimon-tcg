import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-025.js";

describe("BT8-025 Hookmon", () => {
  it("trashes the bottom source of an opposing Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-025"] }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-042", as: "target", under: ["BT8-003", "BT8-034"] }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const bottomId = s.perm("target").stack.at(-1)!.instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
