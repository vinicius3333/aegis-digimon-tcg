import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-052.js";
import "../BT9/BT9-047.js";
import "../BT19/BT19-095.js";
import "../BT19/BT19-098.js";
import "../P/P-130.js";
import "../index.js";

const MAKURAMON = "EX5-052";
const DEVA = "EX5-051";

describe("EX5-052 Makuramon", () => {
  it("matches the catalog and encodes all printed clauses, zones, and inheritance", () => {
    expect(getCardDefinition(MAKURAMON)).toMatchObject({
      cardId: MAKURAMON,
      nameEn: "Makuramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva"],
      effectText: expect.stringContaining("without the same name as the cards in your battle area or trash"),
      inheritedEffectText: expect.stringContaining("gains ＜Blocker＞"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Deva"], match: "trait" }] },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        breeding: true,
        notSameNameAs: ["battleArea", "trash"],
        optional: true,
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn" && !entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Tamer"], playCostLte: 2 }, count: "all" },
          restriction: "suspend",
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it.each(["battleArea", "trash"] as const)(
    "answers Q3638: %s names are excluded while the mandatory draw remains",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: DEVA, as: "existing" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: DEVA, as: "discarded" }] } : {}),
            hand: [
              { card: MAKURAMON, as: "makura" },
              { card: DEVA, as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
        s.inst("candidate").instanceId,
        s.inst("drawn").instanceId,
      ]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("answers Q3639: cards under Digimon or Tamers are not collision zones, while a public Option permanent is", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: [DEVA] },
            { card: "EX5-064", as: "tamerHost", under: [DEVA] },
          ],
          hand: [
            { card: "BT19-098", as: "option" },
            { card: MAKURAMON, as: "makura" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          trash: [{ card: "BT19-095", as: "fieldOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("fieldOption").instanceId,
      ),
    );
    const fieldOption = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("fieldOption").instanceId,
    );
    expect(fieldOption?.topCard?.cardId).toBe("BT19-095");
    expect(fieldOption?.placedByEffect).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3640 and Q3642: breeding effect-play suppresses the played card and played-card watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: MAKURAMON, as: "makura" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawnByMakura" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawnByMakura").instanceId]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === DEVA)).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3641 through public movement: a Deva played into breeding cannot attack that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: MAKURAMON, as: "makura" },
            { card: DEVA, as: "candidate" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("candidate").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3643: an opponent's effect-play restriction prevents the breeding play but not the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: MAKURAMON, as: "makura" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("makura").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("candidate").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("restricts only opposing low-cost Tamers during the real opponent turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: MAKURAMON, as: "makura" }] },
      1: {
        battleArea: [
          { card: "BT3-095", as: "low" },
          { card: "BT1-085", as: "above" },
        ],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("low"), "suspend")).toBe(false);
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("low"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("above"), "suspend")).toBe(false);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherits Blocker only for a Four Sovereigns or God Beast host", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-053", as: "host", under: [MAKURAMON] }] } });
    matching.state.turnSeat = 1;
    await matching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Blocker")).toBe(true);

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-049", as: "host", under: [MAKURAMON] }] } });
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("host"), "Blocker")).toBe(false);
  });
});
