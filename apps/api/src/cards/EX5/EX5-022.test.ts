import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-022.js";
import "../BT1/BT1-112.js";
import "../BT9/BT9-047.js";
import "./EX5-006.js";
import "../P/P-130.js";
import "../index.js";

describe("EX5-022 Mihiramon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-022")).toMatchObject({
      cardId: "EX5-022",
      nameEn: "Mihiramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva"],
      evoCosts: [],
      effectText: expect.stringContaining("trash the top digivolution card"),
      inheritedEffectText: expect.stringContaining("If this Digimon has the [Four Sovereigns]/[God Beast]"),
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
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
          amount: 1,
          fromTop: true,
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn" });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });

  it("answers Q3577: battle-area and trash names exclude the candidate, while an Option permanent is in scope", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "EX5-009", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "EX5-009", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-022", as: "mihiramon" },
              { card: "EX5-009", as: "candidate" },
            ],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    }

    const option = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
            { card: "BT1-097", as: "option" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await option.ready();
    await advance(option.engine).verb.placeOptionAsPermanent(option.inst("option").instanceId);
    expect(option.engine.applyIntent(0, { type: "playCard", instanceId: option.inst("mihiramon").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => option.state.players[0]!.breeding?.topCard?.instanceId === option.inst("candidate").instanceId);
    expect(option.state.players[0]!.breeding?.topCard?.instanceId).toBe(option.inst("candidate").instanceId);
    expect(option.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3578: names under Digimon and Tamers do not block the hand candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["EX5-009"] },
            { card: "EX5-064", as: "tamerHost", under: ["EX5-009"] },
          ],
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3579 and Q3581: breeding effect-play suppresses candidate On Play and when-played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-012"]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-009")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3580 through public movement: a breeding Digimon moved this turn cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId,
      ),
    );
    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("candidate").permanentId,
      target: { kind: "player" },
    });
    expect(attack.ok).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3582: an effect-play restriction prevents the breeding play but not the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the optional Deva play refusal after the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-022", as: "mihiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes exactly one opposing top source when one of your Digimon is played, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-022", as: "mihiramon" }],
          hand: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 15;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 2);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-011");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT6-029", "EX5-033"] as const)(
    "proves inherited memory for the %s [Four Sovereigns]/[God Beast] route and same-turn OPT",
    async (hostCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: hostCard, as: "host", under: ["EX5-022"] },
              { card: "BT1-088", as: "greenSource" },
            ],
            hand: [{ card: "BT1-112", as: "unsuspendOption" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "targetA", suspended: true },
              { card: "BT1-010", as: "targetB", suspended: true },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.phase = Phase.Main;
      s.state.turnSeat = 0;
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unsuspendOption").instanceId),
      );
      expect(s.state.memory).toBe(7);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: s.perm("targetA").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));
      expect(s.state.memory).toBe(8);
      await settle(() => s.perm("host").isSuspended === false);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: s.perm("targetB").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      expect(s.state.memory).toBe(8);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-022"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("resets the inherited Once Per Turn record on the next own turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-029", as: "host", under: ["EX5-022"] }], deck: ["BT1-009", "BT1-010"] },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);

    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const beforeReset = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(beforeReset + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("keeps the inherited clause inactive without either listed trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-022"] }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-022"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
