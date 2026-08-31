import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-233.js";

describe("P-233 Eri Karan", () => {
  it("exposes On Play and Security effects", () => {
    const source = { isOnBattleArea: () => true } as unknown as CardSource;
    expect(getEffectModule("P-233")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.effectKey).toBe("P-233/on-play");
    expect(getEffectModule("P-233")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!.effectKey).toBe(
      "P-233/security",
    );
  });

  it("matches only eligible cards newly linked by the current event", async () => {
    const source = {
      permanent: () => ({ permanentId: "tamer" }),
      definition: { effectText: "" },
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    let subscription: SubTriggerInstall | undefined;
    const effect = getEffectModule("P-233")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      game: { player: () => ({ battleArea: [] }) } as unknown as GameAccess,
      fx: { subscribeSubTrigger: (entry: SubTriggerInstall) => (subscription = entry) } as unknown as Primitives,
    } as unknown as EffectContext);
    const linked = { instanceId: "linked", cardId: "GAME" };
    const invincible = { instanceId: "invincible", cardId: "INVINCIBLE" };
    const host = { controllerSeat: 0, topCard: { instanceId: "top", cardId: "HOST" }, linked: [linked, invincible] };
    const game = {
      opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
      player: (seat: number) => ({ battleArea: seat === 0 ? [host] : [] }),
      permanentById: () => host,
      definitionOf: (card: { cardId: string }) => ({
        kinds: card.cardId === "HOST" ? ["Digimon"] : [],
        types: card.cardId === "GAME" ? ["Game"] : ["Invincible"],
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
      installed.matches?.({
        ...base,
        trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["invincible"] },
      }),
    ).toBe(false);
  });
});
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-233 engine behavior", () => {
  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-233", as: "eri" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("eri"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eri").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eri").instanceId)).toBe(true);
  });
});
