import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-078.js";

describe("BT4-078 Soundbirdmon", () => {
  it("may trash 1 Option from hand when attacking to gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-078", as: "sound" }], hand: [{ card: "BT4-109", as: "option" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sound").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-109") && s.state.memory === 1);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT4-109")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("trashes and gains memory for only one Option per attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-078", as: "sound" }],
          hand: [{ card: "BT4-109", as: "first" }, { card: "BT4-109", as: "second" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sound").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1, 5000);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT4-109")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT4-109")).toHaveLength(1);
  });
});
