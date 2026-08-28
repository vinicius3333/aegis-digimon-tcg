import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-065.js";

const CARD_ID = "EX12-065";

describe("EX12-065 Kaguyamon", () => {
  it("maps the catalog, evolution, Fortitude, all-turns keywords, and shared once-per-turn windows", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 5, traits: ["Puppet", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                playCostLte: 5,
                nameOrTrait: [{ tokens: ["Puppet", "Shambala"], match: "trait" }],
              },
            },
          },
        ],
      });
    }

    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("plays only a matching low-cost Puppet from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "valid" },
            { card: "EX12-063", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining([CARD_ID, "BT1-038"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-063")).toBe(true);
  });

  it("may play a low-cost Shambala Tamer and may decline the shared play effect", async () => {
    const accepted = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], trash: [{ card: "BT26-104", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(accepted.engine).fire(EffectTiming.WhenDigivolving, accepted.perm("source"));
    await settle(() => accepted.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-104"));
    expect(accepted.state.players[0]!.trash).toHaveLength(0);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], trash: [{ card: "BT1-038", as: "puppet" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const resolution = advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("source"));
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declined.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-038"]);
  });

  it("shares the once-per-turn budget across play and attacking windows", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "first" },
            { card: "BT11-035", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const sourceInstanceId = s.inst("source").instanceId;
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038") &&
        advance(s.engine).ledgers.tracker.count(sourceInstanceId, "EX12-065/ir-shared-0") === 1,
    );

    const source = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-035")).toBe(true);
  });

  it("grants Blocker and Retaliation to own Puppet/TB Digimon only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source" },
          { card: "BT1-038", as: "puppet" },
          { card: "EX12-061", as: "tb" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("source"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("puppet"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("tb"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
  });

  it("returns the lowest level on real deletion and Fortitude replays itself when it had a source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-063"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-010", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const sourceId = s.perm("source").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    const replayed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    expect(replayed.permanentId).not.toBe(sourceId);
    expect(replayed.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-063")).toBe(true);
  });

  it("stays deleted without a digivolution source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID)).toBe(true);
  });

  it("uses both normal colors and both alternate traits, rejects a nonmatch, and matches the catalog", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kaguyamon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Puppet", "Sanmyojin", "Tentei Hachibushu", "Shambala", "TB"],
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
    });
    for (const [baseCardId, useAlternateCost, cost] of [
      ["EX12-064", false, 4],
      ["BT1-075", false, 4],
      ["BT1-038", true, 3],
      ["EX12-031", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(4 - cost);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
