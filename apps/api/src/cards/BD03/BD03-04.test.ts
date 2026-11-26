import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-04";
const pteromon = "BD03-03";
const fluffymon = "BD03-01";
const vanillaLevel3 = "BT1-009";

describe("BD03-04 Galemon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Galemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Bird Dragon"],
      rarity: "C",
      effectText: "＜Blocker＞ (This Digimon can block in the blocker timing.)",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from Pteromon for 2 memory and keeps Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: pteromon, as: "base", under: [fluffymon] }],
        hand: [{ card: cardId, as: "galemon" }],
        deck: [vanillaLevel3],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([fluffymon, pteromon]);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("blocks an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "galemon" }], security: [vanillaLevel3] },
        1: { battleArea: [{ card: vanillaLevel3, as: "attacker" }] },
      },
      { autoSelectCards: true },
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
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("galemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("galemon").isSuspended).toBe(true);
  });
});
