import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX4-022.js";
import "../index.js";

describe("EX4-022 ZeedGarurumon", () => {
  it("returns an opposing level four or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("checks eight cards in hand for the second return and requires a Tamer for the inherited return", () => {
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions?.[1]).toMatchObject({
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
      target: { filter: { levelComparison: { op: "gte", value: 6 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [
            {
              kind: "Return",
              target: { filter: { levels: [3] } },
              condition: { kind: "youHave", filter: { kind: ["Tamer"] } },
            },
          ],
        },
      ],
    });
  });

  it("returns level four and then level six Digimon as the opponent reaches eight cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-022", as: "zeed" }] },
        1: {
          hand: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          battleArea: [
            { card: "BT4-009", as: "level4" },
            { card: "BT5-030", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("zeed"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("level6").permanentId)).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(9);
  });

  it("returns an opposing level three Digimon when its inherited trigger sees an effect hand add", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-022", as: "zeed", under: ["BT3-093"] },
            { card: "BT1-089", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "level3" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
