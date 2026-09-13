import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST8/ST8-07.js";
import "./P-092.js";

describe("P-092 Dracomon", () => {
  it("digivolves itself directly into Wingdramon for 3 by ignoring level requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-092", as: "dracomon" }],
          hand: [
            { card: "BT1-020", as: "groundramon" },
            { card: "BT1-080", as: "unrelatedDigimon" },
            { card: "ST8-07", as: "wingdramon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const originalTopId = s.perm("dracomon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dracomon").topCard.instanceId === s.inst("wingdramon").instanceId);

    expect(s.perm("dracomon").stack.some((card) => card.cardId === "P-092")).toBe(true);
    expect(s.perm("dracomon").stack.some((card) => card.instanceId === originalTopId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("unrelatedDigimon").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(2); // 10 - Groundramon 5 - fixed digivolution cost 3
    assertNoLoudGap(s);
  });

  it("inherited effect digivolves a legal level 4 host into Wingdramon for free", async () => {
    const s = setupEngine(
      {
        0: {
          // Wingdramon (ST8-07) requires a Blue level-4 host; ST8-04 (Veemon) is only
          // level 3, so BT1-032 stands in as the real legal level-4 Blue Digimon.
          battleArea: [{ card: "BT1-032", as: "host", under: ["P-092"] }],
          hand: [
            { card: "BT1-020", as: "groundramon" },
            { card: "ST8-07", as: "wingdramon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const originalTopId = s.perm("host").topCard.instanceId;
    const sourceId = s.perm("host").stack.find((card) => card.cardId === "P-092")!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("wingdramon").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("host").stack.some((card) => card.instanceId === originalTopId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q4182 does not offer inherited Wingdramon evolution from an incompatible-color host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "host", under: ["P-092"] }],
        hand: [
          { card: "BT1-020", as: "groundramon" },
          { card: "ST8-07", as: "wingdramon" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("groundramon").instanceId,
      ),
    );
    await settle(() => false, 40);

    expect(s.perm("host").topCard.cardId).toBe("BT1-069");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wingdramon").instanceId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-092")).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
