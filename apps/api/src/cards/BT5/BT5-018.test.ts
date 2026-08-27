import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-018.js";

describe("BT5-018 Dorbickmon", () => {
  it("trashes a red Digimon and adds its DP for the turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("dorbickmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorbickmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorbickmon").currentDP === before + 3000);
    expect(s.perm("dorbickmon").currentDP).toBe(before + 3000);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("Q1294 accumulates DP from separate attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-018", as: "dorbickmon" }],
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT5-007", as: "second" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("dorbickmon").currentDP;
    for (const expected of [before + 3000, before + 5000]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dorbickmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("dorbickmon").currentDP === expected);
      if (expected !== before + 5000) await advance(s.engine).verb.unsuspend([s.perm("dorbickmon").permanentId]);
    }
    expect(s.perm("dorbickmon").currentDP).toBe(before + 5000);
  });

  it("does not trash an ineligible hand card, and may decline with no change", async () => {
    const noCandidate = setupEngine(
      { 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-030"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = noCandidate.perm("dorbickmon").currentDP;
    expect(
      noCandidate.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: noCandidate.perm("dorbickmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => noCandidate.perm("dorbickmon").currentDP === before);
    expect(noCandidate.perm("dorbickmon").currentDP).toBe(before);
    expect(noCandidate.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-030"]);

    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-009"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const declinedBefore = declined.perm("dorbickmon").currentDP;
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("dorbickmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[0]!.hand.length === 1);
    expect(declined.perm("dorbickmon").currentDP).toBe(declinedBefore);
    expect(declined.state.players[0]!.trash).toHaveLength(0);
  });

  it("expires the DP gain at the end of its turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-009"], deck: ["BT1-010"] },
        1: { security: ["BT1-010", "BT1-010"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("dorbickmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorbickmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorbickmon").currentDP === before + 3000);
    expect(s.perm("dorbickmon").currentDP).toBe(before + 3000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("dorbickmon").currentDP).toBe(before);
  });
});
