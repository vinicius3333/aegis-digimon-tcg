import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-003.js";

describe("EX10-003 Tumblemon", () => {
  it("models the inherited opponent-attack prevention with the exact three-card cost", () => {
    const effect = compiled.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOpponentAttacks",
        actions: [{
          kind: "Prevent",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "TrashDigivolution",
            target: { filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] } },
          },
        }],
      }],
    });
  });
});
