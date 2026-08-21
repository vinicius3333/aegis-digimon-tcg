import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-049.js";

describe("BT18-049 Zephyrmon", () => {
  it("gives exactly one own Digimon +3000 DP on play and has Piercing", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine({
      0: { hand: [{ card: "BT18-049", as: "zephyrmon" }], battleArea: [{ card: "BT1-030", as: "target" }] },
    }, { autoSelectCards: true, preferInstanceIds: preferredInstanceIds });
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephyrmon").instanceId })).toEqual({ ok: true });
    await s.ready();
    const zephyrmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT18-049")!;
    expect(observe(s.engine).hasPierce(zephyrmon)).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, zephyrmon);
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
  });
});
