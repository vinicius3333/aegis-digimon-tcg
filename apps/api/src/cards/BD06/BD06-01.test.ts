import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-01";

const cardId = "BD06-01";
const alysionHost = "BD06-05";
const redAlysion = "BD01-02";
const vanilla = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;

function setupAttack(otherDigimon: readonly string[]) {
  return setupEngine({
    0: {
      battleArea: [
        { card: alysionHost, as: "attacker", under: [cardId] },
        ...otherDigimon.map((card, index) => ({ card, as: `other${index}` })),
      ],
      deck: [
        { card: vanilla, as: "first" },
        { card: vanilla, as: "second" },
      ],
    },
    1: { security: [vanilla, vanilla, vanilla] },
  });
}

async function attackPlayer(s: Harness) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").isSuspended && s.state.pendingDecision === undefined);
  await drainMicrotasks(20);
}

describe("BD06-01 Tokomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "Tokomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If you have another Digimon with the [ALYSION] trait, ＜Draw 1＞ (Draw 1 card from your deck.)",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
  });

  it("compiles an inherited once-per-turn When Attacking draw gated on another ALYSION Digimon", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Draw",
            amount: 1,
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
              },
            },
          },
        ],
      },
    ]);
  });

  it("draws 1 when attacking while you have another ALYSION Digimon, once per turn", async () => {
    const s = setupAttack([redAlysion]);
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));

    await attackPlayer(s);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    await attackPlayer(s);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
    assertNoLoudGap(s);
  });

  it("does not draw when the only other Digimon lacks the ALYSION trait, even though the attacker has it", async () => {
    const s = setupAttack([vanilla]);
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));

    await attackPlayer(s);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
