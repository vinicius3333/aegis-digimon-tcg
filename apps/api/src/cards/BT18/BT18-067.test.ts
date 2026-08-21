import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-067.js";

describe("BT18-067 MetalKabuterimon", () => {
  it("de-digivolves one opponent card on play and has Blocker", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-067", as: "metalKabuterimon" }] },
        1: { battleArea: [{ card: "BT18-064", as: "opponentTarget", under: [{ card: "BT1-009", as: "remaining" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const removed = s.perm("opponentTarget").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalKabuterimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-067"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removed));
    await s.ready();

    expect(s.perm("opponentTarget").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("opponentTarget").stack.some((card) => card.instanceId === removed)).toBe(false);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === removed)).toHaveLength(1);
    const metal = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-067")!;
    expect(observe(s.engine).hasKeyword(metal, "Blocker")).toBe(true);
  });
});
