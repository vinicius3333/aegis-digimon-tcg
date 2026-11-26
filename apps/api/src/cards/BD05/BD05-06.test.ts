import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD05-06";
const vanillaPurpleLevel3 = "BT2-067";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";
const strongDefender = "BT1-024";

async function attackPlayerWithMusyamon() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "musyamon", under: [vanillaPurpleLevel3] }],
        hand: [{ card: vanillaRedLevel3, as: "handCard" }],
        deck: [{ card: vanillaRedLevel5, as: "drawn" }],
      },
      1: { security: [vanillaRedLevel3] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("musyamon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

async function attackStrongerDefender(attacker: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [attacker] },
      1: { battleArea: [{ card: strongDefender, as: "defender", suspended: true }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

describe("BD05-06 Musyamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Musyamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      types: ["Wizard"],
      effectText: "[When Attacking] ＜Draw 1＞ (Draw 1 card from your deck.) Then, trash 1 card in your hand.",
      inheritedEffectText:
        "＜Retaliation＞ (When only this Digimon is deleted in battle, delete the Digimon it battled.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws 1 card and then trashes 1 card from the hand when attacking", async () => {
    const s = await attackPlayerWithMusyamon();

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect([...s.state.players[0]!.hand, ...s.state.players[0]!.trash].map((card) => card.instanceId).sort()).toEqual(
      [s.inst("handCard").instanceId, s.inst("drawn").instanceId].sort(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("gives its host Retaliation, deleting the Digimon that defeated it in battle", async () => {
    const s = await attackStrongerDefender({ card: vanillaRedLevel5, as: "attacker", under: [cardId] });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves the defender alive without Musyamon in the stack", async () => {
    const s = await attackStrongerDefender({ card: vanillaRedLevel5, as: "attacker" });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual([strongDefender]);
  });

  it("does not have Retaliation itself while Musyamon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "musyamon", under: [vanillaPurpleLevel3] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("musyamon"), "Retaliation")).toBe(false);
  });
});
