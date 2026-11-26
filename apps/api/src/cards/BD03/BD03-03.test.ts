import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-03";
const fluffymon = "BD03-01";
const vanillaDigimon = "BT1-009";
const vanillaTamer = "ST1-12";
const opponentAttacker = "BT1-014";

async function boardWithPteromonAnd(allies: PermanentSpec[]) {
  const s = setupEngine({
    0: { battleArea: [{ card: cardId, as: "pteromon" }, ...allies] },
    1: { security: [vanillaDigimon, vanillaDigimon] },
  });
  await s.ready();
  return s;
}

function attackPlayerWithPteromon(s: ReturnType<typeof setupEngine>) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm("pteromon").permanentId,
    target: { kind: "player" },
  });
}

describe("BD03-03 Pteromon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Pteromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Bird Dragon"],
      rarity: "R",
      effectText:
        "＜Blocker＞ (This Digimon can block in the blocker timing.)\n[Your Turn] While you have no other Digimon, this Digimon can't attack.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Blocker", async () => {
    const s = await boardWithPteromonAnd([]);

    expect(observe(s.engine).hasKeyword(s.perm("pteromon"), "Blocker")).toBe(true);
  });

  it("can't attack while you have no other Digimon, even with a Tamer", async () => {
    const s = await boardWithPteromonAnd([{ card: vanillaTamer, as: "tamer" }]);

    expect(attackPlayerWithPteromon(s)).toMatchObject({ ok: false });
    expect(s.perm("pteromon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("can attack while you have another Digimon", async () => {
    const s = await boardWithPteromonAnd([{ card: vanillaDigimon, as: "ally" }]);

    expect(attackPlayerWithPteromon(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("blocks on the opponent's turn while it is your only Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "pteromon", under: [fluffymon] }], security: [vanillaDigimon] },
        1: { battleArea: [{ card: opponentAttacker, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("pteromon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([cardId, fluffymon].sort());
  });
});
