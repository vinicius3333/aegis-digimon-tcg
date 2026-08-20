import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-020.js";

describe("EX4-020 MetalGreymon", () => {
  it("gains Rush and trashes up to two opposing Digimon while DigiXrosing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Rush" } }, { kind: "Trash", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2, upTo: true }, condition: { kind: "digiXrosCount", minimum: 1 } }]);
  });
  it("restricts an opposing low-stack Digimon from attacking until opponent turn end", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 3 } } }] });
  });
});
