import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-014.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-014", () => {
  it("reveals 3 for a DM and Ver.2 card, placing the latter under a DM Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "placeUnder" }], rest: "deckBottom" }));
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" }));

  it("reveals a DM card and places a Ver.2 card underneath a DM Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-014", as: "source" }], deck: ["EX9-007", "EX9-014", "BT1-001"] },
    }, { autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-007")).toBe(true);
    expect(s.perm("source").stack.some((card) => card.cardId === "EX9-014")).toBe(true);
  });
});
