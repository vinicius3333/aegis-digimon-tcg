import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-024.js";

describe("BT15-024", () => {
  it("draws with Matt Ishida, otherwise may play one from hand with cost reduced by 3", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 3,
      condition: { kind: "youHaveNone" },
      optional: true,
    });
  });
  it("draws once per turn when attacking", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1 }],
    }));

  it("normally digivolves, draws with an existing Matt, and does not play another from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-020", as: "base" },
            { card: "BT1-086", as: "existingMatt" },
          ],
          hand: [
            { card: "BT15-024", as: "garurumon" },
            { card: "ST2-12", as: "handMatt" },
          ],
          deck: [
            { card: "BT1-001", as: "normalDraw" },
            { card: "BT1-009", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("handMatt").instanceId, s.inst("effectDraw").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "ST2-12")).toHaveLength(0);
  });

  it("without a Matt, may play one from hand while paying exactly its cost reduced by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "base" }],
          hand: [
            { card: "BT15-024", as: "garurumon" },
            { card: "BT1-086", as: "matt" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-086"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("draws only once from two real attacks by a host carrying the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-024"] }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
