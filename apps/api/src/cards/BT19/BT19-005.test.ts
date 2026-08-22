import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-005 Kokuwamon", () => {
  it("grants itself Reboot on the opponent's turn while the opponent has a Digimon", () => {
    const card = runtimeCompiledCard("BT19-005");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" } },
            while: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            },
          },
        ],
      },
    ]);
  });
});
