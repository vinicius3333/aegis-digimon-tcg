import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-095.js";
import "./BT6-105.js";
import "./BT6-112.js";

// A3 for BT6-112 (BeelStarmon) — static play-cost reduction: reduce this card's play cost by the
// number of [Three Musketeers] Digimon + cost-7 Options in your trash (documented behavior).
//
// FAILS-WHEN-REVERTED: with one [Three Musketeers] Digimon in the trash, BT6-112 (printed cost 12)
// plays for 11 — memory 12 → 1. Without the reduction it would cost 12 (memory → 0).

describe("BT6-112 static play-cost reduction by trash [Three Musketeers] / cost-7 Option count", () => {
  it("returns a cost-7 Option from trash, then uses one from hand for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
          trash: [
            { card: "BT6-095", as: "option" },
            { card: "BT6-098", as: "nonSevenOption" },
          ],
          battleArea: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT6-075", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const optionId = s.inst("option").instanceId;
    const nonSevenOptionId = s.inst("nonSevenOption").instanceId;
    preferred.push(optionId, s.perm("target").permanentId);
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 12;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === nonSevenOptionId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("reduces the play cost by 1 with one Three Musketeers Digimon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          trash: ["BT6-017"], // a [Three Musketeers] Digimon in trash → -1 cost
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 12; // printed cost 12; reduced to 11 → memory should land at 1
    // Install the static play-cost modifier (recompute scans hand cards) before playing.
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstarmon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT6-112"));

    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT6-112")).toBe(true);
    // 12 − (12 − 1 reduction) = memory 1. Without the reduction it would be 0.
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce another Three Musketeers card while BeelStarmon is in hand", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT6-112", as: "beelstarmon" },
          { card: "BT6-017", as: "magnaKidmon" },
        ],
        trash: Array.from({ length: 10 }, () => "BT6-095"),
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("magnaKidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-017"));

    expect(s.state.memory).toBe(0);
  });

  it("uses a black Three Musketeers Option through that Option's own color waiver", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
          trash: [{ card: "BT6-105", as: "blackOption" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "deleted" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const optionId = s.inst("blackOption").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("returns but cannot use an ordinary blue cost-7 Option without a blue source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
          trash: [{ card: "BT1-101", as: "blueOption" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const optionId = s.inst("blueOption").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("digivolves from a legal purple level-5 stack without triggering the hand-play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-076", as: "base" }],
        hand: [{ card: "BT6-112", as: "beelstarmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT6-112");

    expect(s.perm("base").topCard.cardId).toBe("BT6-112");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-076"]);
    expect(s.state.memory).toBe(0);
  });
});
