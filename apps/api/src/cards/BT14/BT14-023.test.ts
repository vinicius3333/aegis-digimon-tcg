import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-023.js";

describe("BT14-023", () => {
  it("trashes two opposing sources on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2 }));
  it("restricts an opposing Digimon with no more sources than this one from attacking", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { digivolutionCardsCompareToSource: "lte" } } }] }));
  it("inherits the same once-per-turn attack restriction", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "attack" }] }));
});
