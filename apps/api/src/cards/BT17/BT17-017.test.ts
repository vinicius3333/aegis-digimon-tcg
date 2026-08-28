import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-017.js";

describe("BT17-017", () => {
  it("models Security Attack +1 and deletes an opposing Digimon at or below this card's DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", relativeToSource: true } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });

  it("returns a Tamer and Hybrid Digimon from trash, then plays a Tamer", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "Return", to: "hand", target: { filter: { kind: ["Tamer"] } } },
        { kind: "Return", to: "hand", target: { filter: { kind: ["Digimon"] } } },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
      ],
    });
  });

  it("deletes an opposing Digimon at or below its DP through natural play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-017", as: "ancient" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ancient").topCard.cardId === "BT17-017");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("ancient"), "SecurityAttack")).toBe(true);
  });

  it("digivolves naturally from a red level-5 and applies the DP-relative deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "base" }],
          hand: [{ card: "BT17-017", as: "ancient" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-017");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("DigiXroses Agunimon and BurningGreymon for the printed -3 reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-017", as: "ancient" }],
          battleArea: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("agunimon").topCard.instanceId, s.perm("burning").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ancient").topCard.cardId === "BT17-017");

    expect(s.state.memory).toBe(0);
    expect(s.perm("ancient").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-011", "BT17-012"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("returns the required Tamer and Hybrid cards after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-017", as: "ancient", suspended: true }],
          trash: [{ card: "BT17-081", as: "tamer" }, { card: "BT17-011", as: "hybrid" }],
          hand: [{ card: "BT17-083", as: "playable" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ancient").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-011"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-011")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-081")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083")).toBe(true);
  });
});
