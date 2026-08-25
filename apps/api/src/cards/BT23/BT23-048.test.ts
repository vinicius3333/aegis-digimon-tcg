import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-048.js";

describe("BT23-048 Gotsumon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-048")).toMatchObject({
      cardId: "BT23-048",
      nameEn: "Gotsumon",
      colors: ["Black", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Rock", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("adds one Hudie and one CS Tamer from the top 3 and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-048", as: "gotsu" }],
          deck: [
            { card: "BT23-050", as: "hudie" },
            { card: "BT22-083", as: "csTamer" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gotsu"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT23-050", "BT22-083"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("plays and locks a Hudie, then deletes it only at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [
            { card: "BT23-050", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    const played = s.state.players[0]!.battleArea.find(
      (p) => p.permanentId !== s.perm("host").permanentId && p.topCard?.cardId === "BT23-050",
    );
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-055")).toBe(true);

    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === played!.permanentId)).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === played!.permanentId)).toBe(false);
  });

  it("reveals 3 and adds one Hudie card plus one CS Tamer/Option, bottoming the rest", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] }, count: 1, to: "hand" },
        {
          filter: { kind: ["Tamer", "Option"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("inherited effect optionally plays a Hudie Digimon up to play cost 5, then locks its digivolution and deletes it at opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const actions = effect.actions;
    expect(actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      abortOnDecline: true,
      bindResultAs: "playedHudie",
      target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
    expect(actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "permanent",
      target: { filter: { boundRef: "playedHudie" } },
    });
    expect(actions[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });

  it("digivolves for 0 from an off-color level-2 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-048", as: "gotsu" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("gotsu").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "base" }], hand: [{ card: "BT23-048", as: "gotsu" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("gotsu").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
