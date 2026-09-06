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

describe("BT19-091 Trinity Burst tokens", () => {
  it("preserves the printed 6000 DP colors and no-level identity", () => {
    const expected = [
      ["WarGrowlmon Token", "Red"],
      ["Taomon Token", "Yellow"],
      ["Rapidmon Token", "Green"],
    ] as const;

    for (const [name, color] of expected) {
      const cardId = resolveTokenCardId(name);
      expect(cardId).toBe(`TOKEN-${name.replaceAll(" ", "-")}`);
      expect(tokenDefinitions.find(({ cardId: id }) => id === cardId)).toMatchObject({
        nameEn: name,
        kinds: ["Digimon"],
        colors: [color],
        dp: 6000,
        playCost: -1,
        isToken: true,
      });
      expect(tokenDefinitions.find(({ cardId: id }) => id === cardId)).not.toHaveProperty("level");
    }
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

describe("token printed reminder text", () => {
  it("carries the effect text printed in the creating card's reminder", () => {
    const expected: Record<string, string> = {
      "TOKEN-Petrification-Token":
        "[Your Turn] This Digimon can't suspend.\n[On Deletion] Trash your top security card.",
      "TOKEN-Familiar-Token": "[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.",
      "TOKEN-Fujitsumon-Token": "[All Turns] This Digimon doesn't unsuspend.\n[On Deletion] Trash 1 card in your hand.",
      "TOKEN-Hinukamuy-Token": "＜Alliance＞ ＜Reboot＞ ＜Blocker＞",
      "TOKEN-AthoRenePor-Token": "＜Reboot＞ ＜Blocker＞ ＜Decoy (Red/Black)＞",
      "TOKEN-Paishu": "＜Blocker＞ ＜Guard＞",
    };
    for (const [cardId, effectText] of Object.entries(expected)) {
      expect(tokenDefinitions.find((definition) => definition.cardId === cardId)?.effectText).toBe(effectText);
    }
  });

  it("leaves tokens whose reminder prints only stats without effect text", () => {
    for (const cardId of ["TOKEN-WarGrowlmon-Token", "TOKEN-Gyuukimon-Token", "TOKEN-Diaboromon-Token"]) {
      expect(tokenDefinitions.find((definition) => definition.cardId === cardId)?.effectText).toBeUndefined();
    }
  });
});

describe("BT20-017 Atho, René & Por Token", () => {
  it("has no level or play cost, matching the printed reminder", () => {
    const token = tokenDefinitions.find(({ cardId }) => cardId === "TOKEN-AthoRenePor-Token");
    expect(token).toMatchObject({ colors: ["White"], dp: 6000, playCost: -1, isToken: true });
    expect(token).not.toHaveProperty("level");
  });
});
