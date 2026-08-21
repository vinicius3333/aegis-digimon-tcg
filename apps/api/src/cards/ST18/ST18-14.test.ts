import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("ST18-14 Shoto Kazama", () => {
  it("installs the redirect watcher that can target an opponent Digimon or player", async () => {
    const module = getEffectModule("ST18-14");
    const self = { permanentId: "st18-14", topCard: undefined };
    const source = { cardId: "ST18-14", instanceId: "test", ownerSeat: 0, permanent: () => self, isOnBattleArea: () => true } as never;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const subscriptions: Array<{ event: string }> = [];
    await effects[0]!.resolve({ source, fx: { subscribeSubTrigger: (sub: { event: string }) => subscriptions.push(sub) } } as never);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({ event: "whenAttacking", sourcePermanentId: "st18-14" });
  });

  it("sets memory to three at the start of turn when memory is two or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-14", as: "shoto" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("shoto"));
    expect(s.state.memory).toBe(3);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST18-14", as: "shoto", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shoto"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
  });
});
