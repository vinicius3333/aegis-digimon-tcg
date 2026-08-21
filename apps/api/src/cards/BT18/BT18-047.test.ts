import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT18-047.js";

describe("BT18-047 Arbormon", () => {
  it("suspends the exact opposing target after paying with a green Digimon", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-047", as: "arbormon" }], battleArea: [{ card: "BT18-045", as: "greenCost" }] },
        1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("greenCost").topCard!.instanceId, s.perm("opponentTarget").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arbormon").instanceId })).toEqual({ ok: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.state.players[0]!.battleArea[1]!);

    expect(s.perm("greenCost").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
  });
});
