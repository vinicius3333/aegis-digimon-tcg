import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-013.js";

describe("EX9-013", () => {
  it("has Blast Digivolve, Alliance, and Blocker", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ]),
    );
  });
  it("de-digivolves by 3 on play and digivolving and can DNA digivolve at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "DnaDigivolve", from: ["hand"], payCost: true, optional: true },
      { kind: "Attack", optional: true },
    ]);
  });

  it("DNA digivolves into Omnimon Alter-S and then permits the follow-up attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-013", as: "blitz" },
            { card: "EX9-020", as: "cres" },
          ],
          hand: [{ card: "EX9-021", as: "alterS" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "EX9-021");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-021");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
