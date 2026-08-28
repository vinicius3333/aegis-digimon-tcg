import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-009 Growlmon", () => {
  it.each([0, 1])("optionally plays Takato for free when it has %i Tamer(s)", async (tamerCount) => {
    const tamers = Array.from({ length: tamerCount }, () => ({ card: "BT19-081" }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-009", as: "growlmon" }, ...tamers],
          hand: [{ card: "BT19-080", as: "takato" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("growlmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-080")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not play Takato when it already has 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-081" },
            { card: "BT19-079" },
          ],
          hand: [{ card: "BT19-080", as: "takato" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("growlmon"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-080"]);
  });

  it.each([
    [0, true],
    [1, false],
  ])("applies its numeric DP deletion bonus at memory %i: %s", async (memory, deletesTarget) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "host", under: ["BT19-012", "BT19-009", "BT19-008"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = memory;
    await advance(s.engine).recompute();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 0, 20);

    expect(s.state.players[1]!.battleArea).toHaveLength(deletesTarget ? 0 : 1);
  });

  it("does not add to a DP maximum that references the source Digimon's DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-014", as: "host", under: ["BT19-009"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = -1;
    await advance(s.engine).recompute();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => false, 20);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
