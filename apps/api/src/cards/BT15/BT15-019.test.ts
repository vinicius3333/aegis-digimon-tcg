import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-019.js";

describe("BT15-019", () => {
  it("trashes one opposing digivolution card and draws if the opponent has none remaining", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, fromTop: false, target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "opponentHasNone" } });
  });
});
