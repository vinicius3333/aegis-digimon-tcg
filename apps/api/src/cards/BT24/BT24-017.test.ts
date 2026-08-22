import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-017.js";
import "../index.js";

describe("BT24-017 Medusamon", () => {
  it("deletes the lowest-DP Digimon, pays the exact two-card trash cost, and scales DP", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 3 }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")!;
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }),
        expect.objectContaining({
          kind: "PlayToken",
          tokens: ["Petrification Token"],
          count: 2,
          placedAs: "opponentDigimon",
          cost: { kind: "return", target: { count: 2 } },
        }),
        expect.objectContaining({
          kind: "ModifyDP",
          amount: 2000,
          condition: { kind: "ifThisEffectActed" },
          scaling: { per: 1, unit: "cards" },
        }),
      ]),
    );
  });

  it("deletes the lowest opposing Digimon and returns two opposing trash cards for tokens", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 5000 },
          ],
          trash: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lowest").permanentId),
    );

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lowest").permanentId),
    ).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    ).toHaveLength(2);
  });
});
