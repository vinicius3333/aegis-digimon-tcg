import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT24-096 Seventh Graviton", () => {
  it("pays use cost 7, deletes exactly level 6+, and does not mill after a successful deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "level6" },
            { card: "BT1-020", as: "level5" },
          ],
          deck: [{ card: "BT1-009", as: "top" }, "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(0);
  });

  it("mills the opponent's top 3 only when deletion fails, preserving deck order boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
        1: {
          battleArea: [{ card: "BT1-020", as: "level5" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-045", as: "second" },
            { card: "AD1-001", as: "third" },
            { card: "BT1-080", as: "fourth" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("fourth").instanceId]);
  });

  it("activates the same failed-delete Main branch from Security without paying cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-096", as: "securityOption", faceUp: true }] },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("from trash follows a real Creepymon X digivolution, pays its return cost, and activates Main", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT24-096", as: "graviton" }],
          battleArea: [{ card: "BT8-111", as: "creepymon" }],
          hand: [{ card: "BT24-078", as: "creepymonX" }],
          deck: [{ card: "BT1-009", as: "existingBottom" }],
        },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("creepymon").permanentId,
        instanceId: s.inst("creepymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("graviton").instanceId));
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.memory).toBe(8); // BT24-078's alternate [Creepymon] evolution cost is 2.
    expect(s.perm("creepymon").topCard?.cardId).toBe("BT24-078");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-096")).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT24-096");
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("may decline the trash activation: no return cost and no Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT24-096", as: "graviton" }],
          battleArea: [{ card: "BT8-111", as: "creepymon" }],
          hand: [{ card: "BT24-078", as: "creepymonX" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("creepymon").permanentId,
        instanceId: s.inst("creepymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("creepymon").topCard?.cardId === "BT24-078");
    await settle(() => false, 120);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("graviton").instanceId)).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
