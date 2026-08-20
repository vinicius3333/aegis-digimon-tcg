import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-071.js";
import "../index.js";

describe("BT26-071 Flarerizamon", () => {
  it("digivolves from a level 3 [NSo] Digimon for the alternate cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-030", as: "base" }],
          hand: [{ card: "BT26-071", as: "flarerizamon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flarerizamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("flarerizamon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("grants Raid only while it is an inherited source in a realistic stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-074", as: "host", under: ["BT26-071"] },
          { card: "BT26-071", as: "top" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Raid")).toBe(false);
  });

  it("does not grant the opponent deletion when the self-deletion cost is prevented", async () => {
    const cardSource = {
      ownerSeat: 0 as Seat,
      permanent: () => ({ permanentId: "flarerizamon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const definitions: Record<string, CardDefinition> = {
      OWN: { kinds: [CardKind.Digimon], level: 4 } as CardDefinition,
      OPP: { kinds: [CardKind.Digimon], level: 4 } as CardDefinition,
    };
    const players = [
      { battleArea: [{ permanentId: "own", inBreeding: false, topCard: { cardId: "OWN" } }] },
      { battleArea: [{ permanentId: "opponent", inBreeding: false, topCard: { cardId: "OPP" } }] },
    ];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
    } as unknown as GameAccess;
    const deletePermanent = vi.fn(async () => 0);
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      ask: { chooseTargets: vi.fn(async () => ["own"]) },
      fx: { deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!;

    expect(effect.optional).toBe(true);
    await effect.resolve(ctx);
    expect(deletePermanent).toHaveBeenCalledTimes(1);
    expect(deletePermanent).toHaveBeenCalledWith(["own"], "byEffect");
  });

  it("does not target a Digimon in the opponent's breeding area", () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "flarerizamon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) =>
          seat === 0
            ? { battleArea: [{ permanentId: "own", inBreeding: false, topCard: { cardId: "OWN" } }] }
            : { battleArea: [{ permanentId: "breeding", inBreeding: true, topCard: { cardId: "OPP" } }] },
        definitionOf: () => ({ kinds: [CardKind.Digimon], level: 4 }),
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(false);
  });
});
