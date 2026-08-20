import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-067.js";

describe("EX7-067", () => {
  it("trashes 2 digivolution cards from each opposing Digimon, then may play a level 4 or lower Ice-Snow Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", target: { count: "all" }, amount: 2 });
    expect(actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], condition: { kind: "ifThisEffectDidNotAct" } });
  });
  it("restricts attack for opposing Digimon with no digivolution cards and activates from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[2]).toMatchObject({ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" });
  });
});
