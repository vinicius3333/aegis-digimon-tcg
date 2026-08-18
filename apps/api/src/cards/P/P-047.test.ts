import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-047.js";

describe("P-047 AeroVeedramon Zero", () => {
  it("trashes up to 3 deck cards and gets +3000 DP for the turn with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-010", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-047", as: "source" }],
          // The normal digivolution draw consumes one card; only 2 remain for the effect.
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.deck.length === 0 &&
      s.perm("base").currentDP === s.perm("base").baseDP + 3000,
    );

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 3000);
  });

  it("still trashes 3 cards but gets no DP bonus without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [{ card: "P-047", as: "source" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP);
  });

  it("inherited effect returns exactly 3 non-Digi-Egg cards and grants +2000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: [
            { card: "BT1-009", as: "trash-a" },
            { card: "BT1-010", as: "trash-b" },
            { card: "BT1-011", as: "trash-c" },
            { card: "BT1-001", as: "egg" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const returnedIds = [s.inst("trash-a"), s.inst("trash-b"), s.inst("trash-c")].map(
      (card) => card.instanceId,
    );
    const eggId = s.inst("egg").instanceId;
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id)) &&
        s.perm("attacker").currentDP === baseDp + 2000,
    );
    await settle();

    expect(returnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eggId)).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 2000);
  });

  it("cannot pay the inherited effect with fewer than 3 non-Digi-Egg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: ["BT1-009", "BT1-010", "BT1-001"],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
  });

  it("may decline the inherited return cost and gains no DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] }],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-028"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
  });
});
