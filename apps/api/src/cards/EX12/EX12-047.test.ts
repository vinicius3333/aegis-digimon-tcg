import { compiledEffects, EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { printedKeywordsOf } from "../../engine/combat/keywords.js";
import "../index.js";

describe("EX12-047 Amaterasumon", () => {
  it("deletes the lowest-DP Digimon, returns exactly two trash cards, and uses their distinct colors", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 15000 },
          ],
          trash: ["BT1-010", "BT1-027"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").currentDP === 18000 && s.perm("target").currentDP === 5000);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.perm("source").currentDP).toBe(18000);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-010", "BT1-027"]),
    );
  });

  it("does not apply the follow-up buffs when two opponent trash cards are unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 15000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("source").currentDP).toBe(12000);
    expect(s.perm("target").currentDP).toBe(15000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("Q6816 lets the activating player choose exactly which 2 opposing trash cards are returned", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "deleted", dp: 1000 }],
          trash: [
            { card: "BT1-010", as: "chosenRed" },
            { card: "BT1-027", as: "chosenBlue" },
            { card: "BT1-035", as: "unchosen" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );

    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(request.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("chosenRed").instanceId, s.inst("chosenBlue").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("chosenRed").instanceId, s.inst("chosenBlue").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unchosen").instanceId);
  });

  it("Q6817 counts a returned Digi-Egg even though the rules route it to the Egg Deck", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 15000 },
          ],
          trash: [
            { card: "BT1-001", as: "egg" },
            { card: "BT1-010", as: "normal" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("egg").instanceId, s.inst("normal").instanceId, s.perm("target").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("source").currentDP === 18000);

    expect(s.state.players[1]!.eggDeck.map(({ instanceId }) => instanceId)).toContain(s.inst("egg").instanceId);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("normal").instanceId);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("Q6819 invalidates a deleted Digimon's pending On Deletion when that card is returned", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [{ card: "BT1-035", as: "leomon", dp: 1000 }],
          trash: [{ card: "BT1-010", as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.deck.length === 2);

    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-035", "BT1-010"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("Q6820 counts three distinct colors across a red-blue and blue-yellow pair", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 20000 },
          ],
          trash: [
            { card: "BT16-017", as: "redBlue" },
            { card: "BT16-016", as: "blueYellow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("redBlue").instanceId, s.inst("blueYellow").instanceId, s.perm("target").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.perm("source").currentDP).toBe(18000);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("returns a TB card and plays a level-5-or-lower TB Digimon after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-047", as: "source" }],
          trash: [{ card: "EX12-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    await s.ready();
    const deleting = advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("orderTriggers");
    const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
    const triggerKeys = request?.options?.triggerKeys ?? [];
    const onDeletionKey = triggerKeys.find((key) => key.startsWith("on-deletion/"));
    expect(onDeletionKey).toBeDefined();
    expect(
      s.engine.applyIntent(request!.seat, {
        type: "respondDecision",
        decisionId: request!.decisionId,
        response: { kind: "orderTriggers", order: [onDeletionKey!] },
      } as never),
    ).toEqual({ ok: true });
    await deleting;
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(false);
  });

  it("Q6815 drops the pending On Deletion effect when Ascension resolves first", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-047", as: "source" }],
          trash: [{ card: "EX12-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toContain("EX12-047");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("EX12-009");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX12-009");
  });

  it("publishes Piercing, Security Attack +1, and Ascension as printed keywords", () => {
    const printed = printedKeywordsOf(getCardDefinition("EX12-047")!.effectText);
    expect(printed).toEqual(expect.arrayContaining(["Piercing", "SecurityAttack", "Ascension"]));
  });

  it("digivolves for 4 by either printed color or for 3 over an off-color Shambala level 5", async () => {
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["EX12-046", false, 4],
      ["EX12-015", false, 4],
      ["EX12-031", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-047", as: "target" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-047");
      expect(s.state.memory).toBe(5 - expectedCost);
    }
  });

  it("maps the catalog, keyword, evolution, trash-color seam, timing, and deletion clauses", () => {
    const card = getCardDefinition("EX12-047");
    const compiled = registeredCompiledCards.get("EX12-047")!;
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay")!;
    const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const keywords = compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword);

    expect(card).toMatchObject({
      nameEn: "Amaterasumon",
      colors: ["Yellow", "Red"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Sanmyojin", "Tentei Hachibushu", "Shambala", "TB"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });
    expect(card?.effectText).toContain("returning 2 cards from their trash");
    expect(keywords).toEqual(expect.arrayContaining(["Piercing", "SecurityAttack", "Ascension"]));
    expect(digivolutionRequirementsFor("EX12-047")).toEqual([
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(onPlay.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 6000,
      cost: {
        kind: "return",
        target: { filter: { zone: "trash", controller: "opponent" }, count: 2 },
        trackColors: "returnedCardColors",
      },
    });
    expect(onPlay.actions[2]).toMatchObject({
      kind: "ModifyDP",
      amount: -5000,
      scaling: { unit: "namedCount", countSource: "returnedCardColors" },
    });
    expect(onDeletion.actions[0]).toMatchObject({
      kind: "Return",
      target: { filter: { zone: "trash", controller: "mine" } },
      to: "hand",
      optional: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiledEffects["EX12-047"]).toEqual(compiled);
  });
});
