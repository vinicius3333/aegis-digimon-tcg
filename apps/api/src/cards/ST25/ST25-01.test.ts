import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "ST25-01";
const gemmon = "ST25-02";
const vanillaRedLevel3 = "BT1-009";

async function boardWithHost(host: string, opponentMemory: number, turnSeat: 0 | 1 = 0) {
  const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: [cardId] }] } });
  s.state.turnSeat = turnSeat;
  s.state.memory = turnSeat === 0 ? -opponentMemory : opponentMemory;
  await s.ready();
  return s;
}

describe("ST25-01 Tokomon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Tokomon",
      nameJp: "トコモン",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      rarity: "C",
      inheritedEffectText:
        "[Your Turn] While your opponent has 3 or more memory, this Digimon with [Gemmon] in its text gets +3000 DP.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives a Gemmon host +3000 DP while the opponent has exactly 3 memory", async () => {
    const s = await boardWithHost(gemmon, 3);
    expect(s.perm("host").currentDP).toBe(1000 + 3000);
    assertNoLoudGap(s);
  });

  it("gives nothing while the opponent has 2 memory", async () => {
    const s = await boardWithHost(gemmon, 2);
    expect(s.perm("host").currentDP).toBe(1000);
  });

  it("gives nothing to a host without [Gemmon] in its text", async () => {
    const s = await boardWithHost(vanillaRedLevel3, 5);
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("gives nothing during the opponent's turn", async () => {
    const s = await boardWithHost(gemmon, 5, 1);
    expect(s.perm("host").currentDP).toBe(1000);
  });
});
