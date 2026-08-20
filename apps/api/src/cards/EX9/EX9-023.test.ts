import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-023.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-023", () => {
  it("reveals 3 for a DM and Ver.3 card, placing the latter under a DM Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "placeUnder" }], rest: "deckBottom" }));
  it("inherits Barrier", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" }));

  it("adds a revealed DM card and places a Ver.3 card face down under a DM Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-022", as: "host" }, { card: "EX9-023", as: "source" }],
        deck: ["EX9-022", "EX9-023", "BT1-009"],
      },
    }, { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("host").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0].hand.some((card) => card.cardId === "EX9-022")).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "EX9-023" && !card.faceUp)).toBe(true);
    expect(s.state.players[0].deck).toHaveLength(1);
  });
});
