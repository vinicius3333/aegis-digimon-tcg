import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-045.js";

describe("EX5-045 Chuumon", () => {
  it("reveals three and may play Sukamon from the top during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "trash", condition: { kind: "isOpponentsTurn" }, add: [{ to: "play", optional: true, filter: { nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }] } }] });
  });
  it("inherits free Chuumon play from trash if this was a Sukamon or Etemon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, condition: { kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] } });
  });
});
