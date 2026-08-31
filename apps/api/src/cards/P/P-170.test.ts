import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-170.js";

describe("P-170 AvengeKidmon", () => {
  it("encodes the alternate Three Musketeers digivolution requirement", () => {
    expect(runtimeCompiledCard("P-170")!.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Three Musketeers"], cost: 4, isAlternate: true },
    ]);
  });

  it("returns three text-matching cards to reduce its play cost by six", () => {
    const replacement = runtimeCompiledCard("P-170")!
      .effects.flatMap((effect) => effect.actions)
      .find((action) => action.kind === "Replacement")!;

    expect(replacement).toMatchObject({
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 6,
      cost: {
        kind: "return",
        to: "deckBottom",
        target: {
          count: 3,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }],
          },
        },
      },
    });
  });

  it("encodes Raid, Blocker, Retaliation, and the conditional deletion play effect", () => {
    const card = runtimeCompiledCard("P-170")!;
    expect(card.effects.filter((effect) => effect.keywords?.length === 1).flatMap((effect) => effect.keywords)).toEqual(
      [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Retaliation", raw: "＜Retaliation＞" },
      ],
    );

    expect(card.effects.find((effect) => effect.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 12,
          nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
        },
      },
    });
  });

  it("plays a level-12-or-lower Three Musketeers Digimon from hand after deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-170", as: "avenge" }], hand: [{ card: "BT25-085", as: "musketeer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("avenge").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("musketeer").instanceId)).toBe(
      true,
    );
  });

  it("returns exactly three Three Musketeers-text cards to pay the reduced play cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-170", as: "avenge" }],
          trash: ["BT6-095", "BT6-105", "BT6-109"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("avenge").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("avenge").instanceId),
    );
    expect(s.state.players[0]!.deck.slice(-3).map((card) => card.cardId)).toEqual(["BT6-095", "BT6-105", "BT6-109"]);
    expect(s.state.memory).toBe(3);
  });

  it("exposes all three printed battle keywords on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-170", as: "avenge" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("avenge"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("avenge"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("avenge"), "Retaliation")).toBe(true);
  });
});
