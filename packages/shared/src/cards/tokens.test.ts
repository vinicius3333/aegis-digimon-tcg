import { describe, expect, it } from "vitest";
import { resolveTokenCardId, tokenDefinitions } from "./tokens.js";

describe("BT14 Four Great Dragons tokens", () => {
  it("preserves the printed identity, absent level/play cost, and combat keywords", () => {
    expect(resolveTokenCardId("Amon of Crimson Flame")).toBe("TOKEN-Amon-of-Crimson-Flame");
    expect(resolveTokenCardId("Umon of Blue Thunder")).toBe("TOKEN-Umon-of-Blue-Thunder");
    expect(tokenDefinitions.find(({ cardId }) => cardId === "TOKEN-Amon-of-Crimson-Flame")).toMatchObject({
      nameEn: "Amon of Crimson Flame",
      colors: ["Red"],
      kinds: ["Digimon"],
      dp: 6000,
      playCost: -1,
      effectText: "＜Rush＞",
      isToken: true,
    });
    expect(tokenDefinitions.find(({ cardId }) => cardId === "TOKEN-Umon-of-Blue-Thunder")).toMatchObject({
      nameEn: "Umon of Blue Thunder",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      dp: 6000,
      playCost: -1,
      effectText: "＜Blocker＞",
      isToken: true,
    });
    for (const cardId of ["TOKEN-Amon-of-Crimson-Flame", "TOKEN-Umon-of-Blue-Thunder"]) {
      const token = tokenDefinitions.find((definition) => definition.cardId === cardId);
      expect(token).not.toHaveProperty("level");
    }
  });
});

describe("LM-018 Gyuukimon Token", () => {
  it("preserves the printed token identity and stats", () => {
    expect(tokenDefinitions.find(({ cardId }) => cardId === "TOKEN-Gyuukimon-Token")).toMatchObject({
      nameEn: "Gyuukimon Token",
      kinds: ["Digimon"],
      colors: ["Purple"],
      level: 5,
      playCost: 7,
      dp: 3000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
      isToken: true,
    });
  });
});

describe("EX7-058 Volée & Zerdrücken Token", () => {
  it("preserves the printed identity, level, DP, color, and keywords", () => {
    const cardId = resolveTokenCardId("Volée & Zerdrücken");
    expect(cardId).toBe("TOKEN-Volée-&-Zerdrücken");
    expect(tokenDefinitions.find(({ cardId: id }) => id === cardId)).toMatchObject({
      nameEn: "Volée & Zerdrücken",
      kinds: ["Digimon"],
      colors: ["Purple"],
      level: 4,
      dp: 5000,
      playCost: -1,
      effectText: "＜Blocker＞ ＜Retaliation＞",
      isToken: true,
    });
  });
});
