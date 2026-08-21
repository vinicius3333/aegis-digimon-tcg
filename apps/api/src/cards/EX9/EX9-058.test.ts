import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-058.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-058", () => {
  it("reveals three and adds a DM card and places a Ver.5 card under a DM Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand" }, { to: "placeUnder" }] }));
  it("adds the DM card before choosing a remaining Ver.5 card and a DM host", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ add: [{ count: 1, to: "hand", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } }, { count: 1, to: "placeUnder", faceDown: true, filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] }, underFilter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } }] }));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
  it("adds a DM reveal, places the Ver.5 reveal face-down under a DM host, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-050", as: "host" }, { card: "EX9-058", as: "source" }],
        deck: ["EX9-049", "EX9-010", "BT1-009"],
      },
    }, { autoSelectCards: true, autoOrderCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-049")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(s.perm("host").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: false });
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });
});
