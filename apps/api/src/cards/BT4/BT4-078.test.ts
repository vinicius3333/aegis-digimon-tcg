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
          hand: [
            { card: "BT4-109", as: "first" },
            { card: "BT4-109", as: "second" },
          ],
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

  it("may decline the Option payment and leave the card in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-078", as: "sound" }], hand: [{ card: "BT4-109", as: "option" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sound").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-109")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT4-109")).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT4-078 Soundbirdmon — KB Q&A rulings", () => {
  it("trashes only 1 Option card per attack, so it gains only 1 memory (Q1229)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-078", as: "sound" }],
          hand: [
            { card: "BT4-109", as: "first" },
            { card: "BT4-109", as: "second" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const optionIds = [s.inst("first").instanceId, s.inst("second").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sound").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.kind).toBe("selectCards");
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining(optionIds));
    expect(decision.options?.max).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: optionIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT4-109")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT4-109")).toHaveLength(1);
  });
});
