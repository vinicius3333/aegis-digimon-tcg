import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-068.js";

describe("BT6-068 Impmon", () => {
  it("may trash a hand card to return a Three Musketeers Digimon from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-068", as: "source" },
            { card: "BT6-069", as: "discard" },
          ],
          trash: [
            { card: "BT6-017", as: "returned" },
            { card: "BT6-076", as: "unmatched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("discard").instanceId, s.inst("returned").instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("returned").instanceId));
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("unmatched").instanceId);
  });

  it("returns nothing when the optional hand trash is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-068", as: "source" },
            { card: "BT6-069", as: "kept" },
          ],
          trash: [{ card: "BT6-017", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT6-068"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
