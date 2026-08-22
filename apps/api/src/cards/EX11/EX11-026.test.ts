import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-026.js";
import "../index.js";

describe("EX11-026 Pteromon", () => {
  it("has the inherited once-per-turn battle-win memory watcher", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-026", as: "pteromon" }] } });
    await s.ready();
    const source = { instanceId: "source", cardId: "EX11-026", ownerSeat: 0, definition: {}, permanent: () => s.perm("pteromon"), isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX11-026")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("pteromon"), "Raid")).toBe(false);
  });
});
