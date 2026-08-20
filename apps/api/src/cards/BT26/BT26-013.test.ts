import { EffectTiming, digivolutionRequirementsFor, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-013.js";
import "../index.js";

const CARD_ID = "BT26-013";

describe("BT26-013 Musyamon", () => {
  it("uses the exact Lv.3 Shambala/TS cost-2 evolution and rejects an off-color non-trait Lv.3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["Shambala", "TS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-008", as: "base" }],
        hand: [{ card: CARD_ID, as: "musyamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("musyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-027", as: "plain" }], hand: [{ card: CARD_ID, as: "musyamon" }] },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("musyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.state.memory).toBe(2);
  });

  it("on play pays the hand-trash cost, deletes an opponent Digimon at exactly 6000 DP, and ignores 7000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "musyamon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT26-012", as: "six", dp: 6000 },
            { card: "BT26-014", as: "seven", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    const sixId = s.perm("six").permanentId;
    const sevenId = s.perm("seven").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("musyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === sixId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([sevenId]);
    const musyamon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === CARD_ID)!;
    expect(observe(s.engine).hasKeyword(musyamon, "Blocker")).toBe(true);
  });

  it("on deletion resolves from trash and may pay from hand to delete the opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "musyamon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-012", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("musyamon").permanentId])).toBe(1);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining([CARD_ID, "BT1-009"]));
  });

  it("may decline the hand-trash cost and leaves the target in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "musyamon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-012", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: false },
    );
    const cardSource = {
      instanceId: s.perm("musyamon").topCard.instanceId,
      cardId: CARD_ID,
      ownerSeat: 0 as Seat,
      permanent: () => s.perm("musyamon"),
    } as CardSource;
    const effect = module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;
    await effect.resolve({
      source: cardSource,
      game: {
        player: (seat: Seat) => s.state.players[seat],
        opponentOf: () => 1 as Seat,
        definitionOf: () => ({ kinds: ["Digimon"] }),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => []) },
      fx: { trash: vi.fn(), deletePermanent: vi.fn() } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete when the selected hand-trash cost fails to move", async () => {
    const handCard = { instanceId: "cost", cardId: "BT1-009" } as CardInstance;
    const deletePermanent = vi.fn();
    const cardSource = { instanceId: "source", cardId: CARD_ID, ownerSeat: 0 as Seat } as CardSource;
    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: (seat: Seat) =>
          seat === 0
            ? { hand: [handCard] }
            : { battleArea: [{ permanentId: "target", topCard: { cardId: "TARGET" }, currentDP: 6000 }] },
        opponentOf: () => 1 as Seat,
        definitionOf: () => ({ kinds: ["Digimon"] }),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => ["cost"]), chooseTargets: vi.fn(async () => ["target"]) },
      fx: { trash: vi.fn(async () => []), deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(deletePermanent).not.toHaveBeenCalled();
  });

  it("targets by current DP, excludes non-Digimon cards, and requires the controller's target choice", async () => {
    const chooseTargets = vi.fn(async (_ctx, opts: { candidates: string[] }) => {
      expect(opts.candidates).toEqual(["modified"]);
      return ["modified"];
    });
    const deletePermanent = vi.fn();
    const cardSource = { instanceId: "source", cardId: CARD_ID, ownerSeat: 0 as Seat } as CardSource;
    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: (seat: Seat) =>
          seat === 0
            ? { hand: [{ instanceId: "cost" }] }
            : {
                battleArea: [
                  { permanentId: "modified", topCard: { cardId: "BIG" }, currentDP: 6000 },
                  { permanentId: "too-big", topCard: { cardId: "SMALL" }, currentDP: 7000 },
                  { permanentId: "tamer", topCard: { cardId: "TAMER" }, currentDP: 0 },
                ],
              },
        opponentOf: () => 1 as Seat,
        definitionOf: (card: { cardId: string }) => ({ kinds: card.cardId === "TAMER" ? ["Tamer"] : ["Digimon"] }),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => ["cost"]), chooseTargets },
      fx: { trash: vi.fn(async () => [{}]), deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(deletePermanent).toHaveBeenCalledWith(["modified"], "byEffect");
  });

  it("grants the inherited +2000 DP only while under another Digimon on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.perm("top").currentDP).toBe(5000);

    const opponentTurnSource = {
      instanceId: s.inst("source").instanceId,
      cardId: CARD_ID,
      ownerSeat: 0 as Seat,
      permanent: () => s.perm("host"),
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
    } as CardSource;
    const inherited = module
      .effectsForTiming(EffectTiming.None, opponentTurnSource)
      .find((effect) => effect.effectKey.endsWith("inherited-dp-boost"))!;
    expect(inherited.canTrigger({ source: opponentTurnSource } as EffectContext)).toBe(false);
  });
});
