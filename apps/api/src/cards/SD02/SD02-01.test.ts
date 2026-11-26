import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD02/SD02-01";

const cardId = "SD02-01";
const renamon = "SD02-02";
const tenkomon = "SD02-03";
const vanillaLevel6 = "ST2-10";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";
const bottomSource = "BT1-003";

function attackingSetup(attacker: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker] },
      1: {
        battleArea: [{ card: vanillaLevel5, as: "target", under: [bottomSource, vanillaLevel3, vanillaLevel3] }],
        security: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
      },
    },
    { autoSelectCards: true },
  );
  const attackPlayer = async () => {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  };
  return { s, attackPlayer };
}

describe("SD02-01 Viximon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Viximon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      rarity: "U",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If this Digimon has the [ALYSION] trait, trash the bottom digivolution card of 1 of your opponent's Digimon.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
  });

  it("compiles the inherited once-per-turn bottom trash gated by the ALYSION trait", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
            fromTop: false,
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("trashes only the bottom digivolution card once per turn when an ALYSION host attacks", async () => {
    const { s, attackPlayer } = attackingSetup({ card: tenkomon, as: "host", under: [cardId] });
    await s.ready();

    await attackPlayer();
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel3, vanillaLevel3]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(bottomSource);

    s.perm("host").isSuspended = false;
    await attackPlayer();
    expect(s.perm("target").stack).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("stacks with Renamon's inherited once-per-turn trash in a Viximon to Renamon to Tenkomon stack", async () => {
    const { s, attackPlayer } = attackingSetup({ card: tenkomon, as: "host", under: [cardId, renamon] });
    await s.ready();

    await attackPlayer();

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel3]);
    assertNoLoudGap(s);
  });

  it("does nothing under a host without the ALYSION trait", async () => {
    const { s, attackPlayer } = attackingSetup({ card: vanillaLevel6, as: "host", under: [cardId] });
    await s.ready();

    await attackPlayer();

    expect(s.perm("target").stack).toHaveLength(3);
  });
});
