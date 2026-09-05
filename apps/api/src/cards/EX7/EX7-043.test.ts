import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-043.js";

describe("EX7-043", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 by returning 3 Three Musketeers cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
      optional: true,
      cost: { kind: "return", to: "deckTop", target: { count: 3, filter: { zone: ["hand", "trash"] } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
      cost: { kind: "return", to: "deckTop", target: { count: 3, filter: { zone: ["hand", "trash"] } } },
    });
  });
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));

  it("returns three Three Musketeers cards from a mixed hand/trash pool before de-digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-043", as: "tank" }],
          hand: ["EX7-066"],
          trash: ["EX7-070", "EX7-071"],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tank"));
    const owner = s.state.players[0]!;
    expect(new Set(owner.deck.slice(0, 3).map((card) => card.cardId))).toEqual(
      new Set(["EX7-066", "EX7-070", "EX7-071"]),
    );
    expect(owner.hand.some((card) => card.cardId === "EX7-066")).toBe(false);
    expect(owner.trash.some((card) => ["EX7-070", "EX7-071"].includes(card.cardId))).toBe(false);
    expect(s.perm("target").topCard.cardId).toBe("EX7-011");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("uses the same three-card cost on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-043", as: "tank" }],
          hand: ["EX7-066"],
          trash: ["EX7-070", "EX7-071"],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tank"));
    expect(s.perm("target").topCard?.cardId).toBe("EX7-011");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("does not de-digivolve when fewer than three qualifying cost cards exist", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-043", as: "tank" }], hand: ["EX7-066", "BT1-001"] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tank"));
    expect(s.perm("target").topCard?.cardId).toBe("EX7-014");
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
