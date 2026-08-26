import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-007.js";

describe("BT18-007 Gazimon", () => {
  it("reveals three and adds one Millenniummon and one Composite/Wicked God card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });

    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-007", as: "gazimon" }],
          deck: [{ card: "BT18-019" }, { card: "BT19-075" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT19-075"),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-075")).toBe(true);
    expect(s.state.players[0]!.deck.length).toBe(2);
  });

  it("adds the one available category match as required by Q2909", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-007", as: "gazimon" }],
          deck: [{ card: "BT18-019" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves from Pagumon for 0 with the alternate requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-007", as: "pagumon" }],
        hand: [{ card: "BT18-007", as: "gazimon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pagumon").permanentId,
        instanceId: s.inst("gazimon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pagumon").topCard.cardId === "BT18-007");
    expect(s.state.memory).toBe(2);
    expect(s.perm("pagumon").stack.at(-1)?.cardId).toBe("BT2-007");
  });

  it("grants executable inherited Retaliation to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-030", dp: 3000, as: "host", under: ["BT18-007"] }] },
      1: { battleArea: [{ card: "BT1-030", dp: 4000, suspended: true, as: "defender" }] },
    });
    const defenderId = s.perm("defender").permanentId;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(defenderId);
  });
});
