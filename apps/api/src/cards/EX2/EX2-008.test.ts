import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-008.js";

describe("EX2-008 Guilmon", () => {
  it("adds a Growlmon/Gallantmon and Takato from the top four on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-008", as: "guilmon" }],
          deck: [
            { card: "EX2-009", as: "growlmon" },
            { card: "EX2-056", as: "takato" },
            "EX2-014",
            "EX2-015",
            "EX2-031",
            "EX2-032",
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-031,EX2-032,EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("growlmon").instanceId, s.inst("takato").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-031", "EX2-032", "EX2-014", "EX2-015"]);
  });

  it("deletes a 3000 DP target when inherited by a Growlmon-family host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", under: ["EX2-008"], as: "attacker" }], deck: ["BT1-005"] },
        1: {
          battleArea: [
            { card: "EX2-014", dp: 3000, as: "target" },
            { card: "EX2-014", dp: 3000, as: "secondTarget" },
            { card: "EX2-014", dp: 4000, as: "aboveLimit" },
          ],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-006"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("aboveLimit").permanentId),
    ).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("does not add cards when none of the top four match either name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-008", as: "guilmon" }],
          deck: ["EX2-014", "EX2-015", "EX2-016", "EX2-017"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-008"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("does not delete a low-DP target when inherited by a non-Growlmon-family host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", under: ["EX2-008"], as: "attacker" }] },
      1: { battleArea: [{ card: "EX2-031", dp: 3000, as: "target" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
