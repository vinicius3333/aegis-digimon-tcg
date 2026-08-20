import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-018.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-018", () => {
  it("reduces its play cost by trashing a Cyborg or Ver.2 card and trashes one opposing digivolution card by placing a trash Digimon underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", cost: { kind: "trash" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "Return", to: "deckBottom" });
  });

  it("uses one trash Digimon to trash one stack card, then bottoms an opposing Digimon with no stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-018", as: "source" }], trash: ["EX9-017"] },
      1: {
        battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-001"] }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[1].battleArea.some((permanent) => permanent.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1].deck.at(-1)?.cardId).toBe("BT1-009");
  });
});
