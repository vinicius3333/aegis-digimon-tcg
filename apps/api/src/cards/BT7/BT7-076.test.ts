import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-076.js";

describe("BT7-076 Orochimon", () => {
  it("draws 1 when this card is trashed from hand by an effect", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT7-076", as: "orochimon" }],
        deck: [{ card: "BT7-072", as: "drawn" }],
      },
    });

    await advance(s.engine).verb.trash([s.inst("orochimon").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("orochimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when the opponent's effect trashes this card from hand", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT7-076", as: "orochimon" }],
        deck: [{ card: "BT7-072", as: "notDrawn" }],
      },
    });

    await advance(s.engine).verb.trash([s.inst("orochimon").instanceId], 1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("orochimon").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("orochimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("trashes a hand card to gain 1 memory when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-077", under: ["BT7-076"], as: "host" }],
          hand: [{ card: "BT7-072", as: "cost" }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
