import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("ST21-01 Tsunomon", () => {
  it("matches the catalog clause and keeps the inherited deletion return optional", () => {
    expect(getCardDefinition("ST21-01")?.inheritedEffectText?.replace(/\u00a0/g, " ")).toContain(
      "return 1 Digimon card with the [ADVENTURE] trait from your trash to the hand",
    );
    expect(runtimeCompiledCard("ST21-01")?.effects).toContainEqual({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    });
  });

  it("returns exactly one qualifying ADVENTURE Digimon from trash after its evolution stack is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-02", as: "host", under: ["ST21-01"] }],
          trash: ["AD1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["ST21-01"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-001"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["AD1-001"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "ST21-01", "ST21-02"]);
  });

  it("does not return a card when the optional inherited effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-02", as: "host", under: ["ST21-01"] }],
          trash: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => false, 20);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["AD1-001", "ST21-01", "ST21-02"]);
  });
});
