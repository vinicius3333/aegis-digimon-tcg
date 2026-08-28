import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-047.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-047", () => {
  it("has Rush and Collision and returns a Negamon-text Digimon from trash on deletion", () => {
    expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(
      expect.arrayContaining([
        { keyword: "Rush", raw: "＜Rush＞" },
        { keyword: "Collision", raw: "＜Collision＞" },
      ]),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } },
        },
      ],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("returns a Negamon-text Digimon from trash to hand on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-047", as: "source" }], trash: ["EX9-054"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.hand.some((card) => card.cardId === "EX9-054"));
    expect(player.hand.some((card) => card.cardId === "EX9-054")).toBe(true);
  });
});
