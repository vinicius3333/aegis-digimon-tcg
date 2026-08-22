import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX12-057.js";
import "../index.js";

describe("EX12-057 Takutoumon", () => {
  it("maps the catalog, Shambala evolution, shared Once Per Turn token effect, and chained watcher", () => {
    const card = getCardDefinition("EX12-057");
    expect(card?.effectText).toContain("[Paishu]");
    expect(card?.effectText).toContain("＜De-Digivolve 2＞");
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Shambala"], cost: 3, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving", "Counter"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayToken",
            count: 1,
            payCost: false,
            optional: true,
            tokens: [
              { name: "Paishu", color: "Yellow", dp: 6000, keywords: [{ keyword: "Blocker" }, { keyword: "Guard" }] },
            ],
          },
        ],
      });
    }

    const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(watcher).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "DeDigivolve",
              amount: 2,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
            { kind: "ModifyDP", amount: -6000, duration: "untilOpponentTurnEnd" },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a real Paishu token with 6000 DP, Yellow, Blocker, and Guard", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX12-057", as: "takutoumon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("takutoumon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Paishu"),
    );

    const token = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "TOKEN-Paishu");
    expect(token).toBeDefined();
    expect(token!.currentDP).toBe(6000);
    expect(getCardDefinition("TOKEN-Paishu")?.colors).toEqual(["Yellow"]);
    expect(observe(s.engine).hasKeyword(token!, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token!, "Guard")).toBe(true);
  });

  it("de-digivolves one opponent and applies -6000 when this Digimon itself is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-057", as: "takutoumon" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponent", under: ["EX12-057", "EX12-057", "EX12-057"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const opponent = s.perm("opponent");
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("takutoumon"));
    await settle(() => opponent.stack.length === 1);

    expect(opponent.stack).toHaveLength(1);
    expect(opponent.currentDP).toBe((getCardDefinition("EX12-057")?.dp ?? 0) - 6000);
  });
});
