import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-055.js";
import "./EX2-055.js";
import "./EX2-007.js";
import "./EX2-046.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-055 Reaper", () => {
  it("matches the catalog, errata, Q&A, and compiled clauses", () => {
    expect(getCardDefinition("EX2-055")).toMatchObject({
      cardId: "EX2-055",
      nameEn: "Reaper",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 20,
      dp: 15000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Ability Synthesis Agent"],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "When you would play this Digimon, you may trash 7 or more digivolution cards from the bottom of 1 of your [Mother D-Reaper]s to set this Digimon's play cost to 0.＜Rush＞ (This Digimon can attack the turn it comes into play.) [When Attacking] You may place 2 [ADR-02 Searcher]s from your trash under this Digimon in any order as its bottom digivolution cards to unsuspend this Digimon.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "BeforePayCost",
          actions: [
            {
              kind: "ReducePlayCost",
              payment: {
                kind: "trashDigivolution",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
                  },
                  count: 1,
                },
                minimum: 7,
              },
              amount: { kind: "fixed", value: 20 },
            },
          ],
        },
        {
          trigger: "Static",
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Rush", raw: "＜Rush＞" },
              duration: "permanent",
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
                  },
                  count: 2,
                  from: ["trash"],
                },
              },
              optional: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("plays for free and removes 7 digivolution cards from a Mother D-Reaper", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-007",
              dp: 13000,
              as: "mother",
              under: Array.from({ length: 8 }, () => "BT1-009"),
            },
          ],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const mother = s.perm("mother");
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    expect(s.state.memory).toBe(10);
    expect(mother.stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(7);
  });

  it("keeps the Mother stack intact and pays the printed cost when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 7 }, () => "BT1-009") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    expect(s.perm("mother").stack).toHaveLength(7);
    expect(s.state.memory).toBe(10);
  });

  it("lets the player trash 8 sources when more than the seven-card minimum is chosen", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 8 }, () => "BT1-009") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(8);
    expect(s.state.memory).toBe(10);
  });

  it("trashes the bottom seven digivolution cards rather than the top seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-007",
              as: "mother",
              under: [
                { card: "BT1-009", as: "bottom" },
                { card: "BT1-013", as: "source2" },
                { card: "BT1-009", as: "source3" },
                { card: "BT1-013", as: "source4" },
                { card: "BT1-009", as: "source5" },
                { card: "BT1-013", as: "source6" },
                { card: "BT1-009", as: "source7" },
                { card: "BT1-013", as: "top" },
              ],
            },
          ],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("places exactly 2 ADR-02 Searchers from trash under itself and unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-055", as: "reaper", suspended: false, under: ["BT1-009"] }],
          trash: [
            { card: "EX2-046", as: "firstSearcher" },
            { card: "EX2-046", as: "secondSearcher" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const reaper = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "EX2-055")!;
    const firstId = s.inst("firstSearcher").instanceId;
    const secondId = s.inst("secondSearcher").instanceId;
    const originalSourceId = reaper.stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: reaper.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => reaper.stack.length === 3 && !reaper.isSuspended);
    expect(reaper.stack.map((card) => card.instanceId)).toEqual([firstId, secondId, originalSourceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(reaper.isSuspended).toBe(false);
  });

  it("has Rush and can attack on the same turn after its free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 7 }, () => "BT1-009") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    const reaper = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === reaperId)!;
    expect(observe(s.engine).hasKeyword(reaper, "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: reaper.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("does not set its cost to 0 with only six Mother D-Reaper sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 6 }, () => "BT1-009") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    const reaperId = s.inst("reaper").instanceId;
    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaperId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === reaperId));
    expect(s.state.memory).toBe(10);
    expect(s.perm("mother").stack).toHaveLength(6);
  });

  it("does not unsuspend or place cards when fewer than two Searchers are in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-055", as: "reaper", suspended: false, under: ["BT1-009"] }],
          trash: [{ card: "EX2-046", as: "onlySearcher" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reaper").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("reaper").isSuspended).toBe(true);
    expect(s.perm("reaper").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("onlySearcher").instanceId);
  });
});
