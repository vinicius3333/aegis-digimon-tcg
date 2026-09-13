import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-060.js";

describe("EX6-060 Belphemon: Rage Mode", () => {
  it("trashes up to three hand cards, suspends one low-level opponent per card, and deletes all lowest-cost suspended Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { count: 3, upTo: true }, trackCount: "trashedCards" },
      { kind: "RepeatPerCount", countSource: "trashedCards", action: { kind: "Suspend" } },
      { kind: "Delete", target: { count: "all", filter: { superlative: "lowestPlayCost" } } },
    ]));
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving outside battle", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      actions: [
        { kind: "PlaceUnder", target: { from: ["trash"] }, position: "bottom", underFilter: { zone: "breeding" } },
      ],
    }));
  it("publicly trashes available hand cards on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-021", as: "sleep" }],
          hand: [{ card: "EX6-060", as: "belphe" }, "BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sleep").permanentId,
        instanceId: s.inst("belphe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(2);
  });
  it("publicly repeats one suspension per trashed card before deleting only the lowest-cost target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-021", as: "sleep" }],
          hand: [{ card: "EX6-060", as: "belphe" }, "BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "mid" },
            { card: "BT1-053", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sleep").permanentId,
        instanceId: s.inst("belphe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-010", "BT1-053"]);
    expect(s.state.players[1]!.battleArea.every((perm) => perm.isSuspended)).toBe(true);
  });

  it("legally evolves from Belphemon: Sleep Mode for one memory and resolves the inherited hand cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-021", as: "sleep" }],
          hand: [{ card: "EX6-060", as: "rage" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sleep").permanentId,
        instanceId: s.inst("rage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sleep").topCard.cardId === "EX6-060");
    expect(s.perm("sleep").stack.map((card) => card.cardId)).toEqual(["EX10-021"]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
  });

  it("does not spend the optional hand cost when declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-060", as: "belphe" }, "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("belphe").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("rejects a non-Belphemon Sleep Mode level 6 evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-055", as: "wrong" }], hand: [{ card: "EX6-060", as: "belphe" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrong").permanentId,
        instanceId: s.inst("belphe").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
