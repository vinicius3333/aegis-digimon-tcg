import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-007.js";
import "../index.js";

describe("BT21-007 Agumon", () => {
  it("optionally returns one Reptile or Dragonkin Digimon from trash and grants +2000 DP on your turn", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            amount: 2000,
            duration: "permanent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["Reptile", "BT1-010"],
    ["Dragonkin", "BT1-025"],
  ])("optionally returns one %s Digimon from trash through a real play", async (_label, eligible) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-007", as: "agumon" }],
          trash: [
            { card: eligible, as: "eligible" },
            { card: "BT1-009", as: "nearMatch" },
            { card: "BT21-095", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nearMatch").instanceId, s.inst("option").instanceId]),
    );
    expect(s.state.memory).toBe(7);
  });

  it("may decline the trash return and does not take an opponent's matching card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-007", as: "agumon" }],
          trash: [{ card: "BT1-010", as: "mine" }],
        },
        1: { trash: [{ card: "BT1-025", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-007"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mine").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponent").instanceId);
  });

  it("does not offer the optional return when only the opponent has an eligible trash card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-007", as: "agumon" }], trash: [{ card: "BT1-009", as: "mine" }] },
        1: { trash: [{ card: "BT1-025", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-007"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mine").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponent").instanceId);
  });

  it("gains inherited DP after a public legal evolution into level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "egg" }],
        hand: [
          { card: "BT21-007", as: "agumon" },
          { card: "BT21-015", as: "cyclonemon" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-007");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("cyclonemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-015");
    expect(s.perm("egg").currentDP).toBe(7000);
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("egg").currentDP).toBe(5000);
  });

  it("grants the inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-015", as: "host", dp: 5000, under: ["BT21-001", "BT21-007"] }],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
