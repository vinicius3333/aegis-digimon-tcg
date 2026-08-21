import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX9-074.js";

/**
 * The six-color branch: `DeletePerColor` reads the source's digivolution stack, and reading it
 * through `flatMap` threw (ArraySchema implements the array methods it can synchronize and
 * refuses the rest), so the whole effect crashed instead of deleting anything.
 */
describe("EX9-074 six-color digivolution stack", () => {
  it("deletes one opponent Digimon per color in its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-074",
              as: "omegamon",
              under: ["BT1-009", "BT1-027", "BT1-045", "BT1-064", "BT10-058", "BT10-071"],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
            { card: "BT1-045", as: "yellow" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("omegamon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses a single-color Digimon before a multicolor Digimon for the same color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-074", as: "omegamon", under: ["BT1-009", "BT1-027", "BT1-045", "BT1-064", "BT10-058", "BT10-071"] }],
        },
        1: {
          battleArea: [
            { card: "BT11-018", as: "redBlue" },
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
            { card: "BT10-058", as: "black" },
            { card: "BT10-071", as: "purple" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("omegamon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT11-018"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
