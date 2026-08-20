import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-049.js";

describe("BT23-049 Monodramon", () => {
  it("pays exactly one matching hand card for both payloads and aborts both when unpayable", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-049", as: "mono" }],
          hand: [
            { card: "BT23-053", as: "matching" },
            { card: "BT1-085", as: "nonmatching" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    paid.state.memory = 0;
    const matchingId = paid.inst("matching").instanceId;
    const nonmatchingId = paid.inst("nonmatching").instanceId;
    await advance(paid.engine).fire(EffectTiming.OnStartMainPhase, paid.perm("mono"));

    expect(paid.state.players[0]!.trash.some((card) => card.instanceId === matchingId)).toBe(true);
    expect(paid.state.players[0]!.hand.some((card) => card.instanceId === nonmatchingId)).toBe(true);
    expect(paid.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(paid.state.memory).toBe(1);

    const unpaid = setupEngine({
      0: {
        battleArea: [{ card: "BT23-049", as: "mono" }],
        hand: [{ card: "BT1-085", as: "nonmatching" }],
        deck: [{ card: "BT1-009", as: "top" }],
      },
    });
    await advance(unpaid.engine).fire(EffectTiming.OnStartMainPhase, unpaid.perm("mono"));
    expect(unpaid.state.players[0]!.deck).toHaveLength(1);
    expect(unpaid.state.memory).toBe(0);
  });

  it("trashes one matching card from hand before drawing and gaining memory", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg", "Device", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
    });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("grants the inherited host +1000 DP permanently", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });
});
