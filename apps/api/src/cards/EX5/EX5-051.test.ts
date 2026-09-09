import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-051.js";
import "../BT1/BT1-013.js";
import "./EX5-006.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";

describe("EX5-051 Caturamon", () => {
  it("matches the catalog and encodes Blocker, breeding play, and inherited Blocker", () => {
    expect(getCardDefinition("EX5-051")).toMatchObject({
      cardId: "EX5-051",
      nameEn: "Caturamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva"],
      effectText: expect.stringContaining("＜Blocker＞"),
      inheritedEffectText: expect.stringContaining("Four Sovereigns"),
    });
    expect(compiled.effects?.[0]?.keywords?.[0]?.keyword).toBe("Blocker");
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
  it("grants inherited Blocker while this Digimon has Four Sovereigns or God Beast", () => {
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
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses inherited Blocker through the public opponent-turn block window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-053", as: "host", under: ["EX5-051"] }],
          security: ["BT1-014"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("draws a Deva and plays it into the empty breeding area without firing its On Play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-051", as: "catura" }], deck: [{ card: "EX5-052", as: "deva" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-052");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-052");
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-052")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("catura"), "Blocker")).toBe(true);
  });

  it("does not play a drawn Deva whose name is already represented in the battle area", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-051", as: "catura" }], deck: [{ card: "EX5-051", as: "same" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-051");
  });

  it("ignores matching names under Digimon and Tamers (Q3632/Q3633)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["EX5-052"] },
            { card: "EX5-064", as: "tamerHost", under: ["EX5-052"] },
          ],
          hand: [
            { card: "EX5-051", as: "catura" },
            { card: "EX5-052", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("suppresses the breeding candidate's On Play and play watchers (Q3634/Q3636)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-051", as: "catura" },
            { card: "EX5-052", as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-052")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps a breeding effect-played Digimon from attacking after public movement (Q3635)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-051", as: "catura" },
            { card: "EX5-052", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("candidate").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws but cannot effect-play a Deva while play-by-effect is restricted (Q3637)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-051", as: "catura" },
            { card: "EX5-052", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "restriction" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("catura").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits Blocker only for a Four Sovereigns or God Beast host", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-053", as: "host", under: ["EX5-051"] }] } });
    matching.state.turnSeat = 1;
    await matching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Blocker")).toBe(true);

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-051"] }] } });
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("host"), "Blocker")).toBe(false);
  });
});
