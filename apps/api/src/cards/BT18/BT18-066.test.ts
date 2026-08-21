import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-049.js";
import "./BT18-064.js";
import "./BT18-066.js";

describe("BT18-066 Sephirothmon", () => {
  it("places a level-4 Hybrid from trash and activates that card's On Play effect", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "target" }, { card: "BT18-064", as: "base" }],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          trash: [{ card: "BT18-049", as: "hybrid", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    const targetInitialDP = s.perm("target").currentDP;
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("sephirothmon").instanceId,
    })).toEqual({ ok: true });
    await s.ready();
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-066" && permanent.stack.some((card) => card.instanceId === s.inst("hybrid").instanceId)));
    const sephirothmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-066")!;

    expect(sephirothmon.topCard?.cardId).toBe("BT18-066");
    expect(sephirothmon.stack.find((card) => card.instanceId === s.inst("hybrid").instanceId)?.faceUp).toBe(true);
    expect(sephirothmon.stack.filter((card) => card.instanceId === s.inst("hybrid").instanceId)).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(false);
    await settle(() => s.perm("target").currentDP === targetInitialDP + 3000);
    expect(s.perm("target").currentDP).toBe(targetInitialDP + 3000);
  });
});
