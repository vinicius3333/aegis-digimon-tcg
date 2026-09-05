import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-052.js";

describe("EX5-052 Makuramon", () => {
  it("draws then plays a unique Deva from hand into breeding", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
      },
    ]);
  });
  it("suspends all opposing Tamers with play cost 2 or less and inherits conditional Blocker", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn" && entry.actions?.[0]?.kind === "Restrict"),
    ).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "permanent",
          target: { count: "all", filter: { kind: ["Tamer"], playCostLte: 2 } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } }],
    });
  });

  it("draws a Deva and plays it into the empty breeding area without firing its On Play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-052", as: "makura" }], deck: [{ card: "EX5-051", as: "deva" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-051");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-051");
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
  });

  it("does not play a drawn Deva whose name is already represented in the battle area", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-052", as: "makura" }], deck: [{ card: "EX5-052", as: "same" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-052");
  });

  it("permanently restricts only opposing Tamers at play cost 2 or less during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-052", as: "makura" }] },
      1: {
        battleArea: [
          { card: "BT3-095", as: "low" },
          { card: "BT1-085", as: "above" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("low"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("above"), "suspend")).toBe(false);
  });

  it("inherits Blocker only for a Four Sovereigns or God Beast host", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-053", as: "host", under: ["EX5-052"] }] } });
    matching.state.turnSeat = 1;
    await matching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Blocker")).toBe(true);

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-052"] }] } });
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("host"), "Blocker")).toBe(false);
  });
});
