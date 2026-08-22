import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-004 Tentomon", () => {
  it("grants itself +2000 DP on your turn only while another green Digimon is present", () => {
    const card = runtimeCompiledCard("BT19-004");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "modifyDP", amount: 2000 },
            while: {
              kind: "youHave",
              filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Green"] },
            },
          },
        ],
      },
    ]);
  });
});
