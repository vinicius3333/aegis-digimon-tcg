import { describe, expect, it } from "vitest";
import { translator } from "../i18n";
import { keywordBaseName, keywordNotes, keywordReminder, normalizeKeywordBrackets } from "./keywordReminders";

const t = translator("en");

describe("keyword reminders", () => {
  it("reduces printed and server spellings to one glossary name", () => {
    expect(keywordBaseName("＜Armor Purge＞")).toBe("ArmorPurge");
    expect(keywordBaseName("De-Digivolve 1")).toBe("DeDigivolve");
    expect(keywordBaseName("Security A. +1")).toBe("SecurityAttack");
    expect(keywordBaseName("Decoy (Black)")).toBe("Decoy");
  });

  it("explains Security Attack with the modifier the permanent carries or the card prints", () => {
    expect(keywordReminder("SecurityAttack", t, -2)).toBe("This Digimon checks 2 fewer security card(s).");
    expect(keywordReminder("Security Attack +1", t)).toBe("This Digimon checks 1 additional security card(s).");
  });

  it("points a keyword the glossary does not cover at the card text", () => {
    expect(keywordReminder("Vortex", t)).toBe(t("redesign.arena.keyword.unlisted"));
  });

  it("lists held keywords first, then printed ones, each once", () => {
    const notes = keywordNotes({
      held: ["Blocker"],
      texts: ["＜Blocker＞ ＜Rush＞", "[Your Turn] ＜Security Attack +1＞"],
      t,
    });
    expect(notes.map((note) => note.printed)).toEqual(["Blocker", "Rush", "Security Attack +1"]);
  });

  it("prints full-width brackets as ASCII ones", () => {
    expect(normalizeKeywordBrackets("＜Draw 1＞")).toBe("<Draw 1>");
  });
});
