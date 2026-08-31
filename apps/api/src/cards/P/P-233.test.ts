import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
describe("P-233 engine behavior", () => {
  it("reveals three cards and adds Game and Invincible/Life/Entertainment cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-233", as: "eri" }], deck: ["BT25-045", "BT22-035", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eri").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-045")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-035")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-233", as: "eri" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("eri"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eri").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eri").instanceId)).toBe(true);
  });

  it("gains memory by suspending itself when a matching card is linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-233", as: "eri" },
            { card: "BT21-009", as: "host", linked: [{ card: "BT22-035", as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartTurn);
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
      linkedCardInstanceIds: [s.inst("link").instanceId],
    });
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("eri").isSuspended).toBe(true);
  });

  it("reacts to a real link-card intent for an Entertainment card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-233", as: "eri" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT24-038", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId)).toBe(true);
    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
  });
});
