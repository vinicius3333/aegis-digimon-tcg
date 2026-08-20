import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-046.js";

describe("EX7-046", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }));
  it("gains 1 memory when the opponent has no level 5 or higher Digimon and inherits once-per-turn attack redirection", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentHasNone" } });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] }] });
  });
});
