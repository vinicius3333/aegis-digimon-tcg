import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-022.js";

describe("EX7-022 Numemon", () => {
  it("suspends one opposing Digimon/Tamer on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }));
  it("restricts all of your NSp Digimon from changing attack targets on your turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "whileInPlay", target: { count: "all", filter: { controller: "mine" } } }));
});
