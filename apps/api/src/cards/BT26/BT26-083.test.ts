import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-083.js";

// A3 for BT26-083 (Junomon: Hysteric Mode, BT26): "[On Play] [When Digivolving] Trash
// all of your security cards. For each card this effect trashed, delete 1 of your
// opponent's Digimon. Then, <Recovery +3>."
//
// FAILS-WHEN-REVERTED: deleting a fixed count instead of "1 per trashed security card"
// (or skipping Recovery +3) breaks the scaling; this test asserts exactly N deletes for
// N trashed security cards, and the recovery call afterward.

const CARD_ID = "BT26-083";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "junomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-083 [On Play]/[When Digivolving]: trash all security, delete 1-per-trashed, then Recovery +3", () => {
  it("deletes exactly as many opponent Digimon as security cards trashed, then recovers 3", async () => {
    const opp1 = { permanentId: "opp-1", topCard: { cardId: "AD1-001" } };
    const opp2 = { permanentId: "opp-2", topCard: { cardId: "AD1-001" } };
    const players = [
      { seat: 0 as Seat, security: [{}, {}] }, // 2 security cards
      { seat: 1 as Seat, battleArea: [opp1, opp2] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const deleted: string[][] = [];
    const recovered: number[] = [];
    const fx = {
      trashFromSecurity: vi.fn<(...args: any[]) => any>(async (_seat: Seat, n: number) => Array.from({ length: n }, (_, i) => ({ instanceId: `sec-${i}` }))),
      deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
        deleted.push(ids);
        const opp = players[1] as { battleArea: { permanentId: string }[] };
        opp.battleArea = opp.battleArea.filter((p) => !ids.includes(p.permanentId));
        return ids.length;
      }),
      recoverToSecurity: vi.fn<(...args: any[]) => any>(async (_seat: Seat, n: number) => {
        recovered.push(n);
        return [];
      }),
    } as unknown as Primitives;

    const ask = {
      chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
    } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const effect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-security-wipe`);
    expect(effect).toBeDefined();

    await effect!.resolve(ctx);

    expect(deleted).toEqual([["opp-1"], ["opp-2"]]);
    expect(recovered).toEqual([3]);
  });
});

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-083 engine integration", () => {
  it("performs Recovery +3 with zero starting security (Q7124)", async () => {
    const s = setupEngine({
      0: {
        deck: [
          { card: "AD1-001", as: "recoveryOne" },
          { card: "AD1-002", as: "recoveryTwo" },
          { card: "AD1-003", as: "recoveryThree" },
        ],
        battleArea: [{ card: CARD_ID, as: "junomon" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("junomon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("trashes all security, deletes one Digimon per card, then recovers exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001", "AD1-002", "AD1-003", "AD1-004"],
          security: ["BT5-021", "BT26-009"],
          battleArea: [{ card: CARD_ID, as: "junomon" }],
        },
        1: {
          battleArea: [
            { card: "BT5-021", as: "targetOne" },
            { card: "BT5-022", as: "targetTwo" },
            { card: "BT5-023", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("junomon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("applies Security A. -1 to every opposing Digimon when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "junomon" }] },
      1: { battleArea: [{ card: "AD1-001", as: "one" }, { card: "AD1-002", as: "two" }] },
    });

    await primitives(s).deletePermanent([s.perm("junomon").permanentId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(-1);
  });

  it("plays by Assembly with Junomon and pays 10 after Assembly -4", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "hysteric" }],
        trash: [{ card: "BT25-044", as: "junomonMaterial" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hysteric").instanceId,
        assembly: { materialInstanceIds: [s.inst("junomonMaterial").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)?.stack.length === 1,
    );

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)?.stack[0]?.cardId,
    ).toBe("BT25-044");
  });
});
