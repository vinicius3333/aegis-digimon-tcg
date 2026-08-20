import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-028.js";

describe("BT15-028", () => {
  it("trashes three opposing digivolution cards and may play a blue Tamer if none remain", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3, fromTop: false });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, condition: { kind: "opponentHasNone" } });
  });
});
