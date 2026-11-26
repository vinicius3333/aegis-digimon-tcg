import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "BD03-01";
const birdDragon = "ST5-02";
const avian = "BT1-013";
const giantBird = "BT1-014";
const mineral = "BT10-062";
const pteromon = "BD03-03";

async function boardWithFluffymonUnder(hosts: readonly string[], turnSeat: 0 | 1) {
  const s = setupEngine({
    0: { battleArea: hosts.map((card, index) => ({ card, as: `host${index}`, under: [cardId] })) },
  });
  s.state.turnSeat = turnSeat;
  await s.ready();
  return s;
}

describe("BD03-01 Fluffymon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Fluffymon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Mini Bird"],
      rarity: "U",
      inheritedEffectText: "[Opponent's Turn] This Digimon with [Avian] or [Bird] in any of its traits gets +1000 DP.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives +1000 DP on the opponent's turn only to hosts with Avian or Bird in a trait", async () => {
    const s = await boardWithFluffymonUnder([birdDragon, avian, giantBird, mineral], 1);

    expect(s.perm("host0").currentDP).toBe(5000);
    expect(s.perm("host1").currentDP).toBe(6000);
    expect(s.perm("host2").currentDP).toBe(5000);
    expect(s.perm("host3").currentDP).toBe(5000);
  });

  it("gives no DP during your own turn", async () => {
    const s = await boardWithFluffymonUnder([birdDragon, avian], 0);

    expect(s.perm("host0").currentDP).toBe(4000);
    expect(s.perm("host1").currentDP).toBe(5000);
  });

  it("does nothing while Fluffymon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "egg" }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("egg").currentDP).toBe(0);
  });

  it("keeps the bonus after Pteromon digivolves from Fluffymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: cardId, as: "base" }],
        hand: [{ card: pteromon, as: "pteromon" }],
        deck: [mineral],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pteromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === pteromon);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(s.perm("base").currentDP).toBe(3000);
  });
});
