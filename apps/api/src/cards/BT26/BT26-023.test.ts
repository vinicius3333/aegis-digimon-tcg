import { describe, expect, it, vi } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-023.js";
import "../index.js";

describe("BT26-023 Mojyamon", () => {
  it("uses the exact level-3 DM alternate evolution for cost 2", async () => {
    expect(digivolutionRequirementsFor("BT26-023")).toContainEqual({
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX9-007", as: "redDm" }],
        hand: [{ card: "BT26-023", as: "mojyamon" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("redDm").permanentId,
        instanceId: legal.inst("mojyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("redDm").topCard.cardId === "BT26-023");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "wrongTrait" }],
        hand: [{ card: "BT26-023", as: "mojyamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("mojyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("places the hand card face down before bottom-decking an opponent's level-4 Digimon", async () => {
    const self = { permanentId: "mojyamon", inBreeding: false, topCard: { cardId: "BT26-023" } };
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      topCard: { instanceId: "opponent-card", cardId: "BT26-020" },
    };
    const source = {
      ownerSeat: 0,
      permanent: () => self,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const placeUnder = vi.fn<(...args: any[]) => any>(async () => [{ instanceId: "hand-card" }]);
    const returnToDeck = vi.fn<(...args: any[]) => any>(async () => []);
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) => (seat === 0 ? { hand: [{ instanceId: "hand-card" }] } : { battleArea: [opponent] }),
        definitionOf: (card: { cardId: string }) => ({
          cardId: card.cardId,
          kinds: ["Digimon"],
          level: card.cardId === "BT26-020" ? 4 : 4,
        }),
        permanentById: (id: string) => (id === "opponent" ? opponent : undefined),
      },
      ask: { selectCards: vi.fn<(...args: any[]) => any>(async () => ["hand-card"]) },
      fx: { placeUnder, returnToDeck },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    await effect.resolve(ctx);

    expect(placeUnder).toHaveBeenCalledWith("mojyamon", ["hand-card"], { faceUp: false });
    expect(returnToDeck).toHaveBeenCalledWith(["opponent-card"], { toTop: false });
  });

  it("publicly pays with a face-down bottom card before bottom-decking a level-4 opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "mojyamon" }],
          hand: [{ card: "BT1-001", as: "material" }],
        },
        1: {
          battleArea: [{ card: "BT26-039", as: "target" }],
          deck: ["AD1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("material").instanceId, s.perm("target").permanentId);
    const materialId = s.inst("material").instanceId;
    const targetId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mojyamon"));

    expect(s.perm("mojyamon").stack[0]?.instanceId).toBe(materialId);
    expect(s.perm("mojyamon").stack[0]?.faceUp).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });

  it("does not pay or return a level-5, a Tamer, or a breeding-area Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-023", as: "mojyamon" }],
        hand: [{ card: "BT1-001", as: "material" }],
      },
      1: {
        battleArea: [
          { card: "BT26-030", as: "level5" },
          { card: "BT1-085", as: "tamer" },
        ],
        breeding: { card: "BT26-039", as: "breeding" },
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mojyamon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("mojyamon").stack).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets")).toBe(false);
  });

  it("binds the main When Attacking clause to Mojyamon rather than another ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-023", as: "mojyamon" },
            { card: "BT26-035", as: "ally" },
          ],
          hand: [{ card: "BT1-001", as: "material" }],
        },
        1: { battleArea: [{ card: "BT26-039", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("mojyamon"), {
      attackerPermanentId: s.perm("mojyamon").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Training suspends Mojyamon and places the deck top face down beneath its top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "mojyamon" }],
          deck: [{ card: "BT1-001", as: "trainingCard" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const trainingId = s.inst("trainingCard").instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mojyamon"));

    expect(s.perm("mojyamon").isSuspended).toBe(true);
    expect(s.perm("mojyamon").stack.at(-1)?.instanceId).toBe(trainingId);
    expect(s.perm("mojyamon").stack.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("Training cannot activate while suspended or with an empty deck", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT26-023", as: "mojyamon", suspended: true }], deck: ["BT1-001"] },
    });
    await advance(suspended.engine).fire(EffectTiming.OnDeclaration, suspended.perm("mojyamon"));
    expect(suspended.state.players[0]!.deck).toHaveLength(1);

    const empty = setupEngine({ 0: { battleArea: [{ card: "BT26-023", as: "mojyamon" }] } });
    await advance(empty.engine).fire(EffectTiming.OnDeclaration, empty.perm("mojyamon"));
    expect(empty.perm("mojyamon").isSuspended).toBe(false);
  });

  it("inherited When Attacking draws at 7 cards and not at 8", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["BT26-023"] }],
        hand: Array.from({ length: 7 }, () => "BT1-001"),
        deck: ["BT1-002"],
      },
    });
    await advance(eligible.engine).fireForPermanent(EffectTiming.OnUseAttack, eligible.perm("host"), {
      attackerPermanentId: eligible.perm("host").permanentId,
    });
    expect(eligible.state.players[0]!.hand).toHaveLength(8);

    const ineligible = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["BT26-023"] }],
        hand: Array.from({ length: 8 }, () => "BT1-001"),
        deck: ["BT1-002"],
      },
    });
    await advance(ineligible.engine).fireForPermanent(EffectTiming.OnUseAttack, ineligible.perm("host"), {
      attackerPermanentId: ineligible.perm("host").permanentId,
    });
    expect(ineligible.state.players[0]!.hand).toHaveLength(8);
  });
});
