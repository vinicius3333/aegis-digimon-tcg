import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-217.js";

describe("P-217 Haru Shinkai", () => {
  it("exposes On Play and Security effects", () => {
    const source = { isOnBattleArea: () => true } as unknown as CardSource;
    expect(getEffectModule("P-217")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.effectKey).toBe("P-217/on-play");
    expect(getEffectModule("P-217")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!.effectKey).toBe(
      "P-217/security",
    );
  });

  it("matches only traited cards linked by the current event", async () => {
    const source = {
      permanent: () => ({ permanentId: "tamer" }),
      definition: { effectText: "" },
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    let subscription: SubTriggerInstall | undefined;
    const effect = getEffectModule("P-217")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      game: { player: () => ({ battleArea: [] }) } as unknown as GameAccess,
      fx: { subscribeSubTrigger: (entry: SubTriggerInstall) => (subscription = entry) } as unknown as Primitives,
    } as unknown as EffectContext);
    const linked = { instanceId: "linked", cardId: "SOCIAL" };
    const host = { controllerSeat: 0, topCard: { instanceId: "top", cardId: "HOST" }, linked: [linked] };
    const game = {
      opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
      player: (seat: number) => ({ battleArea: seat === 0 ? [host] : [] }),
      permanentById: () => host,
      definitionOf: (card: { cardId: string }) => ({
        kinds: card.cardId === "HOST" ? ["Digimon"] : [],
        types: card.cardId === "SOCIAL" ? ["Social"] : ["Other"],
      }),
    } as unknown as GameAccess;
    const base = {
      source,
      game,
      trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["linked"] },
    } as unknown as EffectContext;
    const installed = subscription as SubTriggerInstall;
    expect(installed.matches?.(base)).toBe(true);
    expect(
      installed.matches?.({ ...base, trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["other"] } }),
    ).toBe(false);
  });
});
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-217 engine behavior", () => {
  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-217", as: "haru" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("haru"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("haru").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("haru").instanceId)).toBe(true);
  });
});
