import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-130.js";
import "../index.js";
import { compiled } from "./EX5-050.js";

describe("EX5-050 Sinduramon", () => {
  it("matches the catalog and encodes Decoy, draw, unique breeding play, and inherited Blocker", () => {
    expect(getCardDefinition("EX5-050")).toMatchObject({
      cardId: "EX5-050",
      nameEn: "Sinduramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Bird", "Deva"],
      evoCosts: [],
      effectText:
        "＜Decoy (Deva/Four Sovereigns)＞.[On Play] ＜Draw 1＞ (Draw 1 card from your deck). Then, you may play 1 [Deva]\u00a0trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.",
      inheritedEffectText:
        "[Opponent's Turn] While this Digimon has the [Four Sovereigns]/[God Beast]\u00a0trait, it Digimon gains ＜Blocker＞ (At blocker timing, by suspending this Digimon, it becomes the attack target).",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Decoy", raw: "＜Decoy (Deva/Four Sovereigns)＞" },
    ]);

    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Deva"], match: "trait" }],
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        breeding: true,
        notSameNameAs: ["battleArea", "trash"],
        optional: true,
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] },
            raw: "this Digimon has the [Four Sovereigns]/[God Beast] trait",
          },
        },
      ],
      isInherited: true,
    });
  });

  it("draws and effect-plays one Deva into the empty breeding area without its On Play (Q3628)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-050", as: "sindu" },
            { card: "EX5-051", as: "deva" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("deva").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("deva").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3626-Q3627: battle/trash names block, while Digimon and Tamer stacks are ignored", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "EX5-051", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "EX5-051", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-050", as: "sindu" },
              { card: "EX5-051", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    }

    for (const host of ["BT1-009", "EX5-064"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: host, as: "host", under: ["EX5-051"] }],
            hand: [
              { card: "EX5-050", as: "sindu" },
              { card: "EX5-051", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
      expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    }
  });

  it("answers Q3630: breeding effect-play does not fire an effect-play watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-050", as: "sindu" },
            { card: "EX5-051", as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawnBySindu" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawnBySindu").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3629: a Deva promoted from breeding cannot attack that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-050", as: "sindu" },
            { card: "EX5-051", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
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

  it("answers Q3631: an effect-play restriction blocks the breeding play after the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-050", as: "sindu" },
            { card: "EX5-051", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sindu").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited Blocker only to a Four Sovereigns or God Beast host", async () => {
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
