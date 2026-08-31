import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-048.js";

describe("EX6-048 Witchmon", () => {
  it("grants an opposing Digimon an End of Attack self-delete effect by trashing a hand card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      effectText: "[End of Attack] Delete this Digimon.",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
    }));
  it("inherits once-per-turn attack ending by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack" }],
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true } } },
        },
      ],
    }));
});
