import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-050.js";

describe("EX5-050 Sinduramon", () => {
  it("has Decoy for Deva/Four Sovereigns and draws then plays a unique Deva into breeding", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Decoy" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] },
          count: 1,
        },
      },
    ]);
  });
  it("inherits Blocker while it has Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });

  it("draws a Deva and plays it into the empty breeding area without firing its On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-050", as: "sindu" }], deck: [{ card: "EX5-051", as: "deva" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-051");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-051");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-051")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("sindu"), "Decoy")).toBe(true);
  });

  it("does not play a drawn Deva whose name is already represented in the battle area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-050", as: "sindu" }], deck: [{ card: "EX5-050", as: "same" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-050");
  });

  it("inherits Blocker only for a Four Sovereigns or God Beast host", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-053", as: "host", under: ["EX5-050"] }] } });
    matching.state.turnSeat = 1;
    await matching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Blocker")).toBe(true);

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-050"] }] } });
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("host"), "Blocker")).toBe(false);
  });
});
