import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-023.js";

describe("BT15-023", () => {
  it("trashes two opposing digivolution cards and gains 1 memory if none remain", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: false, target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentHasNone" } });
  });
});
