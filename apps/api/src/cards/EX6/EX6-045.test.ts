import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-045.js";

describe("EX6-045 Tsukaimon", () => {
  it("deletes an opposing level 3 Digimon on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] } },
    }));
  it("inherits a once-per-turn attack-ending cost by deleting another Digimon", () =>
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
