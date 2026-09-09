import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-052.js";
import "./index.js";

describe("BT17-052 Agumon", () => {
  it("matches the catalog identity and carries both printed clauses", () => {
    expect(getCardDefinition("BT17-052")).toMatchObject({
      cardId: "BT17-052",
      nameEn: "Agumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile", "SoC"],
      effectText:
        "[All Turns] [Once Per Turn] When one of your [Kosuke Kisakata] is played, gain 1 memory and ＜Draw 1＞.",
      inheritedEffectText: "＜Reboot＞.",
    });
  });

  it("once per turn gains memory and draws when your Kosuke Kisakata is played", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "nameExact" }] },
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "Draw", controller: "mine", amount: 1 },
          ],
        },
      ],
    });
  });

  it("has Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
    ]);
  });

  it("gains memory and draws when Kosuke Kisakata is played, only once in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        hand: [
          { card: "BT16-087", as: "kosuke" },
          { card: "BT16-087", as: "secondKosuke" },
        ],
        deck: [
          { card: "BT1-011", as: "drawn" },
          { card: "BT1-011", as: "notDrawn" },
        ],
      },
    });
    s.state.memory = 9;
    const drawnId = s.inst("drawn").instanceId;
    const notDrawnId = s.inst("notDrawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kosuke").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));
    // Intermediate state: play cost 4 paid, 1 memory gained, 1 card drawn.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([notDrawnId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKosuke").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT16-087").length === 2,
    );

    // Second play in the same turn: cost only, no gain and no draw.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([notDrawnId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("does not trigger on the opponent's own Kosuke Kisakata", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        deck: [{ card: "BT1-011", as: "mine" }],
      },
      1: {
        hand: [
          { card: "BT16-087", as: "theirKosuke" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 9;
    await s.ready();
    const theirKosukeId = s.inst("theirKosuke").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: theirKosukeId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === theirKosukeId),
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("mine").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("resets the once-per-turn draw on the next own turn through the public turn flow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        hand: [
          { card: "BT16-087", as: "first" },
          { card: "BT16-087", as: "second" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        hand: [{ card: "BT1-009", as: "theirSpare" }],
      },
    });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    const firstDeck = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === firstDeck - 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 9;
    const secondDeck = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === secondDeck - 1);

    // Fresh turn, fresh use: the second Kosuke drew again.
    expect(s.state.players[0]!.deck).toHaveLength(secondDeck - 1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT16-087")).toHaveLength(
      2,
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants inherited Reboot to an evolved host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-054", under: ["BT17-052"], as: "host" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("ignores a near-miss Tamer peer and fires only for the exact [Kosuke Kisakata]", async () => {
    // Comparative peer: BT26-096 is "Kosuke Misono", a Tamer sharing only the given name.
    // The catalog holds no card whose name merely CONTAINS "Kosuke Kisakata", so the
    // nameExact vs substring distinction has no observable near-miss; this is the closest
    // available peer and it must not fire the watcher.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        hand: [
          { card: "BT26-096", as: "misono" },
          { card: "BT16-087", as: "kisakata" },
        ],
        deck: [
          { card: "BT1-011", as: "drawn" },
          { card: "BT1-012", as: "notDrawn" },
        ],
      },
    });
    s.state.memory = 9;
    await s.ready();
    const drawnId = s.inst("drawn").instanceId;
    const notDrawnId = s.inst("notDrawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("misono").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-096"));

    // Cost 3 paid, no memory gain and no draw for the near-miss peer.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([drawnId, notDrawnId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kisakata").instanceId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kisakata").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    // Cost 4 paid, then 1 memory gained and 1 card drawn for the exact name.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([notDrawnId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
