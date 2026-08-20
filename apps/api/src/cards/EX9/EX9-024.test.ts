import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-024.js";

describe("EX9-024", () => {
  it("returns a Puppet Digimon from trash by trashing a card from hand on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", optional: true, cost: { kind: "trash" }, target: { count: 1 } }));
  it("inherits a once-per-turn attack-ending effect by deleting another Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "EndAttack", cost: { kind: "deleteOwn" } }] }] }));
});
