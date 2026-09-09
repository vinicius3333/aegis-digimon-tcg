import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-003";

describe("EX11-003 Puroromon", () => {
  it("preserves the catalog identity and inherited IR", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Puroromon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Larva", "X Antibody", "Royal Base", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAddSecurity",
            fireCondition: {
              kind: "allOf",
              conditions: [
                { kind: "triggerSecurityIsYours" },
                {
                  kind: "triggerAddedSecurityHasTrait",
                  filter: { nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
                },
              ],
            },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    );
  });

  it("draws from one public face-up Royal Base placement and refuses the second in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-025", as: "host", under: [cardId], dp: 20000 }],
          security: [
            { card: "BT1-013", as: "security1" },
            { card: "BT1-014", as: "security2" },
            { card: "BT1-015", as: "security3" },
          ],
          hand: [
            { card: "EX11-030", as: "royalA" },
            { card: "EX11-030", as: "royalB" },
            { card: "EX11-030", as: "royalC" },
          ],
          deck: [
            { card: "BT1-009", as: "draw1" },
            { card: "BT1-010", as: "draw2" },
            { card: "BT1-011", as: "spare" },
            { card: "BT1-012", as: "spare2" },
          ],
        },
        1: {
          security: [{ card: "BT1-013", as: "opponentSecurity" }],
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "EX11-030"));
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "EX11-030", faceUp: true });
    expect(s.state.players[0]!.hand.some((card) => card.cardId.startsWith("BT1-"))).toBe(true);
    const deckAfterFirst = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("royalB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.filter((card) => card.cardId === "EX11-030").length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
    await settle(() => s.state.pendingDecision === undefined);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "EX11-030")).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst - 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not subscribe to a face-down flip as a security placement (Q5788)", async () => {
    const subscriptions: Array<{ matches: (ctx: any) => boolean }> = [];
    const source = {
      cardId,
      definition: getCardDefinition(cardId),
      ownerSeat: 0,
      permanent: () => ({ permanentId: "host", linked: [], stack: [] }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    const effect = runtimeCompiledCard(cardId)!.effects.find((entry) => entry.isInherited)!;
    await (
      await import("../../engine/effects/registry.js")
    )
      .getEffectModule(cardId)!
      .effectsForTiming(EffectTiming.None, source)[0]!
      .resolve({ source, fx: { subscribeSubTrigger: (subscription: any) => subscriptions.push(subscription) } } as any);
    expect(subscriptions).toHaveLength(1);
    const trigger = (faceUp: boolean, added = true) => ({
      source,
      trigger: { addedToSecuritySeat: 0, addedToSecurityInstanceIds: added ? ["card"] : [] },
      game: {
        player: () => ({ security: [{ instanceId: "card", faceUp }] }),
        definitionOf: () => ({ types: ["Royal Base"] }),
      },
    });
    expect(subscriptions[0]!.matches(trigger(true))).toBe(true);
    expect(subscriptions[0]!.matches(trigger(false))).toBe(false);
    expect(subscriptions[0]!.matches(trigger(true, false))).toBe(false);
    void effect;
  });
});
