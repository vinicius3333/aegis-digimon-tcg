import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD05-07";
const musyamon = "BD05-06";
const vanillaPurpleLevel4 = "BT3-083";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";

type AttackParams = { attacker: PermanentSpec; others?: PermanentSpec[]; decline?: boolean; attacks?: number };

async function attackPlayer({ attacker, others = [], decline = false, attacks = 1 }: AttackParams) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker, ...others] },
      1: { security: [vanillaRedLevel3, vanillaRedLevel3, vanillaRedLevel3] },
    },
    decline
      ? { autoSelectCards: true, autoDeclineOptional: true }
      : { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 0;
  await s.ready();
  for (let attack = 0; attack < attacks; attack++) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  }
  return s;
}

function battleAreaIds(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.cardId);
}

describe("BD05-07 Karatenmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Karatenmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      types: ["Wizard"],
      effectText: "[When Attacking] Gain 1 memory.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] By deleting 1 of your other Digimon, this Digimon unsuspends.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory when attacking and does not use its inherited effect as the top card", async () => {
    const s = await attackPlayer({
      attacker: { card: cardId, as: "attacker", under: [musyamon] },
      others: [{ card: vanillaRedLevel3, as: "other" }],
    });

    expect(s.state.memory).toBe(1);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(battleAreaIds(s)).toEqual([cardId, vanillaRedLevel3]);
  });

  it("lets its host delete 1 other Digimon to unsuspend once per turn", async () => {
    const s = await attackPlayer({
      attacker: { card: vanillaRedLevel5, as: "attacker", under: [cardId] },
      others: [
        { card: vanillaRedLevel3, as: "otherA" },
        { card: vanillaPurpleLevel4, as: "otherB" },
      ],
      attacks: 2,
    });

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("unsuspends its host right after the first attack", async () => {
    const s = await attackPlayer({
      attacker: { card: vanillaRedLevel5, as: "attacker", under: [cardId] },
      others: [{ card: vanillaRedLevel3, as: "other" }],
    });

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(battleAreaIds(s)).toEqual([vanillaRedLevel5]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([vanillaRedLevel3]);
  });

  it("keeps the host suspended when the deletion is declined or there is no other Digimon", async () => {
    const declined = await attackPlayer({
      attacker: { card: vanillaRedLevel5, as: "attacker", under: [cardId] },
      others: [{ card: vanillaRedLevel3, as: "other" }],
      decline: true,
    });
    expect(declined.perm("attacker").isSuspended).toBe(true);
    expect(battleAreaIds(declined)).toEqual([vanillaRedLevel5, vanillaRedLevel3]);

    const alone = await attackPlayer({ attacker: { card: vanillaRedLevel5, as: "attacker", under: [cardId] } });
    expect(alone.perm("attacker").isSuspended).toBe(true);
    expect(battleAreaIds(alone)).toEqual([vanillaRedLevel5]);
  });
});
