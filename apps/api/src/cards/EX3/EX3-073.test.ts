import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-067.js";
import "./EX3-073.js";

// A3 for EX3-073 (Imperialdramon: Fighter Mode):
//   [When Digivolving] Return 1 [Dragon Mode] from digivolution stack to deck bottom;
//     disable opponent Security effects for the turn.
//   [On Deletion] Play 1 [Wormmon] and 1 [Veemon] from trash without cost.
//
// FAILS-WHEN-REVERTED: removing the On Deletion implementation removes the playInstances calls.

function makeSource(stack: CardInstance[] = []): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX3-073",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX3-073",
      set: "EX3",
      nameEn: "Imperialdramon: Fighter Mode",
      kinds: ["Digimon"] as never,
      colors: ["Purple", "Red"] as never,
      playCost: 13,
      dp: 13000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX3-073", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack,
        linked: [] as never,
        baseDP: 13000,
        currentDP: 13000,
        isSuspended: false,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("EX3-073 Imperialdramon: Fighter Mode", () => {
  const module = getEffectModule("EX3-073");

  it("matches the official identity and Secret Rare metadata", () => {
    expect(getCardDefinition("EX3-073")).toMatchObject({
      nameEn: "Imperialdramon: Fighter Mode",
      colors: ["Purple", "Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      rarity: "SEC",
      types: ["Ancient Dragonkin"],
    });
  });

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 1 None (Piercing static) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("produces 1 WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces 1 OnDestroyedAnyone effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });

  it("[Static] exposes Piercing on the real battle-area permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-073", as: "fighter" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("fighter"))).toBe(true);
  });

  it("returns the real EX3-063 from its stack and suppresses Security for every allied attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-062", under: ["EX3-063"], as: "fighterMode" },
            { card: "BT1-028", as: "ally" },
          ],
          hand: [{ card: "EX3-073", as: "fighterModeCard" }],
        },
        1: {
          security: [{ card: "P-067", as: "securityBulucomon" }],
          deck: ["BT1-029", "BT1-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dragonMode = s.perm("fighterMode").stack[0]!;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fighterMode").permanentId,
        instanceId: s.inst("fighterModeCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === dragonMode.instanceId));

    expect(s.perm("fighterMode").stack.some(({ instanceId }) => instanceId === dragonMode.instanceId)).toBe(false);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("fighterMode"), "P-067")).toBe(true);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("ally"), "P-067")).toBe(true);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-073" && req.kind === "chooseTargets"),
    ).toHaveLength(0);

    const opponentDeckSize = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.deck).toHaveLength(opponentDeckSize);
    assertNoLoudGap(s);
  });

  it("[On Deletion] plays one Wormmon and one Veemon from the real trash zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-073", as: "fighterMode" }],
          trash: [
            { card: "EX3-055", as: "wormmon" },
            { card: "EX3-004", as: "veemon" },
            { card: "BT1-028", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("fighterMode").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-055") &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-004"),
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX3-055", "EX3-004"]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-073" && req.kind === "chooseTargets"),
    ).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
