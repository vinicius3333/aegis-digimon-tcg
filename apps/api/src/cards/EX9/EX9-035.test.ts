import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-035.js";

describe("EX9-035", () => {
  it("reveals three, adds one DM and places one Ver.4 under a DM", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "placeUnder" }] }));
  it("inherits once-per-turn suspension of an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }] }));
});
