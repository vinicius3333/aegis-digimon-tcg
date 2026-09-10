import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-009.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";
import "../index.js";

describe("EX5-009 Indramon", () => {
  it("matches the catalog and encodes both draw effects, unique breeding play, and inherited Security Attack", () => {
    expect(getCardDefinition("EX5-009")).toMatchObject({
      cardId: "EX5-009",
      nameEn: "Indramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Holy Beast", "Deva"],
      effectText:
        "[On Play] ＜Draw 1＞ (Draw 1 card from your deck). Then, you may play 1 [Deva]\u00a0trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.[On Deletion] ＜Draw 1＞ (Draw 1 card from your deck).",
      inheritedEffectText:
        "[Your Turn] While this Digimon has the [Four Sovereigns]/[God Beast]\u00a0trait, it gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card).",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        from: ["hand"],
        notSameNameAs: ["battleArea", "trash"],
        target: {
          count: 1,
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("applies Q3531 to both battle-area and trash names, while keeping the printed draw endpoint", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "BT10-079", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "BT10-079", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-009", as: "indramon" },
              { card: "BT10-079", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 20;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    }
  });

  it("answers Q3532 by excluding cards under Digimon and Tamers from the name comparison", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["BT10-079"] },
            { card: "EX5-064", as: "tamerHost", under: ["BT10-079"] },
          ],
          hand: [
            { card: "EX5-009", as: "indramon" },
            { card: "BT10-079", as: "candidate" },
            { card: "EX5-071", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Structural fixture only: the production placement primitive makes the Option visible in
    // the battle area for Q3531's printed Option-name scope; no card behavior is credited here.
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("answers Q3533 and Q3535: a breeding-area effect play fires neither its On Play nor when-played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-009", as: "indramon" },
            { card: "EX5-051", as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("answers Q3534 through public play and movement: a breeding Digimon moved this turn cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-009", as: "indramon" },
            { card: "BT10-079", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("candidate").permanentId,
      target: { kind: "player" },
    });
    expect(attack.ok).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("answers Q3536: an active effect-play restriction prevents the breeding play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-009", as: "indramon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("honors the optional Deva play decline after the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-009", as: "indramon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("supports legal evolution into a Four Sovereigns host and exposes inherited Security Attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-009", as: "base" }],
        hand: [{ card: "EX5-013", as: "evolution" }],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-013");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-009"]);
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("rejects an illegal evolution source without changing the stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX5-013", as: "evolution" }],
      },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolution").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
