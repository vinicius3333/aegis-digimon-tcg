import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-111.js";
import "./P-022.js";

describe("Imperialdramon promo Option deck", () => {
  it("converts Davis/Ken into Paildramon and the BT3 SEC top end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT3-093", "BT3-094"],
          hand: [
            { card: "P-022", as: "option" },
            { card: "ST9-04", as: "exVeemon" },
            { card: "ST9-09", as: "stingmon" },
            { card: "ST9-05", as: "paildramon" },
            { card: "BT3-111", as: "dragonMode" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST9-05") &&
        ["ST9-04", "ST9-09"].every((cardId) => s.state.players[0]!.deck.some((card) => card.cardId === cardId)) &&
        s.state.pendingDecision === undefined,
      5000,
    );

    const paildramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST9-05")!;
    expect(s.state.memory).toBe(3);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: paildramon.permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => paildramon.topCard.cardId === "BT3-111" && s.state.memory === 0 && s.state.pendingDecision === undefined,
      5000,
    );

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.deck.slice(-2)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["ST9-04", "ST9-09"]);
    assertNoLoudGap(s);
  });
});
