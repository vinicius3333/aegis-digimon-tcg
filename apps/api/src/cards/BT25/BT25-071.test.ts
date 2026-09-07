import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_071 } from "./BT25-071.js";

describe("BT25-071 Orochimon", () => {
  it("matches the catalog identity, alternate TS evolution, and self-scoped once-per-turn watcher", () => {
    expect(getCardDefinition("BT25-071")).toMatchObject({
      nameEn: "Orochimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      types: ["Dark Dragon", "Titan", "TS"],
    });
    expect(BT25_071.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Black"], cost: 3, isAlternate: false },
      { level: 4, traits: ["TS"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      });
    }
    const watchers = BT25_071.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(watchers).toHaveLength(2);
    for (const watcher of watchers ?? []) {
      expect(watcher).toMatchObject({ frequency: "OncePerTurn" });
      const sub = watcher.actions?.[0] as { event?: string; actions?: unknown[] };
      expect(watcher).toMatchObject({
        actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { isSelfRef: true } }],
      });
      expect(sub.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
              playCostLte: 4,
            },
            count: 1,
            to: "play",
            optional: true,
          },
        ],
      });
    }
  });

  it("restricts exactly one opposing Digimon or Tamer until the opponent's turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-071", as: "orochimon" }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opponentDigimon" },
            { card: "BT8-093", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentTamer").permanentId);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("orochimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTamer"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "attack")).toBe(false);
  });

  it("applies the same restriction when digivolving through the alternate TS route", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-013", as: "tsLv4" }],
          hand: [{ card: "BT25-071", as: "orochimon" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsLv4").permanentId,
        instanceId: s.inst("orochimon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("tsLv4").topCard.cardId === "BT25-071" && observe(s.engine).isRestricted(s.perm("opponent"), "attack"),
    );
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
  });

  it("supports the ordinary black Lv.4 route at cost 3 and rejects a wrong-color source", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT10-061", as: "blackBase" }], hand: [{ card: "BT25-071", as: "orochimon" }] },
    });
    ordinary.state.memory = 4;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("blackBase").permanentId,
        instanceId: ordinary.inst("orochimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("blackBase").topCard?.cardId === "BT25-071");
    expect(ordinary.state.memory).toBe(1);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "redBase" }], hand: [{ card: "BT25-071", as: "orochimon" }] },
    });
    wrongColor.state.memory = 4;
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("redBase").permanentId,
        instanceId: wrongColor.inst("orochimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("reacts only when Orochimon itself suspends, plays one eligible TS card, and bottoms the rest in order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-071", as: "orochimon" },
            { card: "BT25-073", as: "other" },
          ],
          deck: ["BT25-012", "BT25-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalDeck = s.state.players[0]!.deck.map((card) => card.cardId);
    await s.ready();

    // A different own permanent suspending must not satisfy “this Digimon suspends”.
    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    await settle();
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(originalDeck);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-013")).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("orochimon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-013"));
    expect(s.perm("orochimon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-013")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-012")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-012", "BT1-013"]);
  });

  it("enforces the shared once-per-turn limit and allows the inherited effect on a realistic stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-068", as: "host", under: ["BT25-071"] },
            { card: "BT25-071", as: "top" },
          ],
          deck: ["BT25-013", "BT1-013", "BT25-012", "BT25-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-013"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT25-013")).toHaveLength(1);
    const deckAfterFirst = s.state.players[0]!.deck.map((card) => card.cardId);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle();
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(deckAfterFirst);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT25-013")).toHaveLength(1);
  });
});
