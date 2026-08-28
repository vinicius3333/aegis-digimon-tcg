import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-04.js";

describe("ST13-04 Duramon", () => {
  it("reduces a Legend-Arms digivolution cost by 1 on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-04", as: "duramon" }],
        hand: [{ card: "ST13-05", as: "durandamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("duramon").permanentId,
        instanceId: s.inst("durandamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("duramon").topCard.cardId === "ST13-05");
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce the cost of a non-black, non-Legend-Arms card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-04", as: "duramon" }],
        hand: [{ card: "BT1-025", as: "wargreymon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("duramon").permanentId,
        instanceId: s.inst("wargreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("duramon").topCard.cardId === "BT1-025");

    expect(s.state.memory).toBe(1);
  });

  it("DNA digivolves its host with the required second material at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "red-material", under: ["ST13-04"] },
            { card: "ST13-14", as: "black-material" },
          ],
          hand: [{ card: "ST13-06", as: "ragna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("red-material"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-06"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("ST13-06");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST13-04", "ST13-05", "ST13-14"]),
    );
  });

  it("cannot use the inherited effect to DNA digivolve into a card without a DNA requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "host", under: ["ST13-04"] },
            { card: "ST13-14", as: "partner" },
          ],
          hand: [{ card: "BT1-025", as: "non-dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("non-dna").instanceId)).toBe(true);
  });
});
