import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-052.js";

describe("EX7-052", () => {
  it("reveals 3, adds a Lilithmon card to hand and a purple card to trash", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "trash" }], rest: "deckBottom" }));
  it("inherits a once-per-turn attack-ending effect by deleting another Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "EndAttack" }], cost: { kind: "deleteOwn" } }] }));
});
