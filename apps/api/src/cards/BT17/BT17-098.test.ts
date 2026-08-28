import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-098.js";
import "./index.js";

describe("BT17-098 Hacker Pride", () => {
  it("reveals Pulsemon-text cards and places the Option in the battle area", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand", count: 1, filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } }],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Delay to place only the selected Digimon's top card into Security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "security",
            position: "top",
            target: {
              count: 1,
              topCardOnly: true,
              filter: {
                levelComparison: { op: "gte", value: 4 },
                nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
              },
            },
          },
        },
      ],
    });
  });

  it("preserves the same reveal-and-place sequence in Security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("adds a Pulsemon-text card and places itself through the public Main flow", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-098", as: "option" }],
          deck: [{ card: "BT17-069", as: "match" }, "BT1-001", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const matchId = s.inst("match").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === matchId)).toBe(true);
  });
});
