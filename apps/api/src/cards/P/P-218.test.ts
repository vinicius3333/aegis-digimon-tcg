import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-218.js";

describe("P-218 Torajiro Asuka", () => {
  it("exposes On Play and Security effects", () => {
    const source = { isOnBattleArea: () => true } as unknown as CardSource;
    expect(getEffectModule("P-218")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.effectKey).toBe("P-218/on-play");
    expect(getEffectModule("P-218")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!.effectKey).toBe(
      "P-218/security",
    );
  });

  it("matches only Entertainment, Tool, or Navi cards linked by the current event", async () => {
    const source = {
      permanent: () => ({ permanentId: "tamer" }),
      definition: { effectText: "" },
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    let subscription: SubTriggerInstall | undefined;
    const effect = getEffectModule("P-218")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      game: { player: () => ({ battleArea: [] }) } as unknown as GameAccess,
      fx: { subscribeSubTrigger: (entry: SubTriggerInstall) => (subscription = entry) } as unknown as Primitives,
    } as unknown as EffectContext);
    const linked = { instanceId: "linked", cardId: "ENTERTAINMENT" };
    const host = { controllerSeat: 0, topCard: { instanceId: "top", cardId: "HOST" }, linked: [linked] };
    const game = {
      opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
      player: (seat: number) => ({ battleArea: seat === 0 ? [host] : [] }),
      permanentById: () => host,
      definitionOf: (card: { cardId: string }) => ({
        kinds: card.cardId === "HOST" ? ["Digimon"] : [],
        types: card.cardId === "ENTERTAINMENT" ? ["Entertainment"] : ["Other"],
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
describe("P-218 engine behavior", () => {
  it("reveals three cards and adds Entertainment and Navi/Tool/Awakening cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-218", as: "torajiro" }], deck: ["BT22-035", "BT21-047", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("torajiro").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-035")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-047")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-218", as: "torajiro" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("torajiro"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("torajiro").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("torajiro").instanceId)).toBe(
      true,
    );
  });

  it("gains memory by suspending itself when a matching card is linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-218", as: "torajiro" },
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
    expect(s.perm("torajiro").isSuspended).toBe(true);
  });

  it("reacts to a real Navi link-card intent and gains memory after paying the link cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-218", as: "torajiro" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT21-047", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
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
    expect(s.perm("torajiro").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
