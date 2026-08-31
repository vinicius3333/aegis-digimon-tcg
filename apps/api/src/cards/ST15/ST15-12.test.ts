import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-12 WarGreymon", () => {
  it("has Blocker and exposes Blast Digivolve from hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "field" }], hand: [{ card: "ST15-12", as: "counter" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("field"), "Blocker")).toBe(true);
    expect(registeredCompiledCards.get("ST15-12")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
      ]),
    );
  });

  it("unsuspends itself when either player's security loses a card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.perm("wargreymon").isSuspended).toBe(false);
  });

  it("can activate only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-010", as: "attacker2" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.perm("wargreymon").isSuspended).toBe(false);

    s.perm("wargreymon").isSuspended = true;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });

  it("does not unsuspend when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });
});
