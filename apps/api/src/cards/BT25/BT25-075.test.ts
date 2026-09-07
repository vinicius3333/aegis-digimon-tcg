import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-075.js";

const CARD_ID = "BT25-075";

describe("BT25-075 Vulcanusmon", () => {
  it("keeps the printed alternate evolution, strict play reduction, link gate, and linked-card scaling", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      level: 6,
      playCost: 12,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      effectText: expect.stringContaining("if you have fewer Digimon than your opponent"),
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Black"], cost: 4, isAlternate: false },
      { level: 5, colors: ["Red"], cost: 4, isAlternate: false },
      { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
    ]);

    const playReduction = compiled.effects?.find((effect) => effect.trigger === "Static")?.actions[0];
    expect(playReduction).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      condition: {
        kind: "boardCountCompare",
        left: "mine",
        right: "opponent",
        op: "lt",
        filter: { kind: ["Digimon"] },
      },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects?.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Link",
        target: { count: 2, upTo: true, filter: { hasLinkRequirement: true } },
        from: ["hand", "trash"],
        payCost: false,
      });
      expect(actions[1]).toMatchObject({
        kind: "DeDigivolve",
        target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
        amount: 1,
        scaling: { per: 1, unit: "linkCards", filter: { controller: "mine", kind: ["Digimon"] } },
      });
    }
  });

  it("supports ordinary Black and Red Lv.5 evolution at cost 4 and rejects a wrong color", async () => {
    for (const [source, as] of [
      ["BT10-064", "blackBase"],
      ["AD1-002", "redBase"],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: source, as }], hand: [{ card: CARD_ID, as: "vulcanusmon" }] },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("vulcanusmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === CARD_ID);
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT10-056", as: "greenBase" }], hand: [{ card: CARD_ID, as: "vulcanusmon" }] },
    });
    wrong.state.memory = 5;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("greenBase").permanentId,
        instanceId: wrong.inst("vulcanusmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses the TS Lv.5 alternate evolution for cost 3 and rejects a non-TS declaration", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-073", as: "tsBase" }], hand: [{ card: CARD_ID, as: "vulcanusmon" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("vulcanusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "nonTsBase" }], hand: [{ card: CARD_ID, as: "vulcanusmon" }] },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("vulcanusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(4);
  });

  it("reduces play cost only when your Digimon count is strictly lower", async () => {
    const reduced = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "vulcanusmon" }] },
        1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    reduced.state.memory = 7;
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("vulcanusmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => reduced.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));
    expect(reduced.state.memory).toBe(0);

    const tied = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "vulcanusmon" }], battleArea: [{ card: "BT25-081", as: "own" }] },
        1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    tied.state.memory = 7;
    expect(tied.engine.applyIntent(0, { type: "playCard", instanceId: tied.inst("vulcanusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tied.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));
    expect(tied.state.memory).toBe(-5); // full printed play cost 12, no strict-fewer reduction
  });

  it("grants Rush and Link +1 only to own TS Digimon, including the source itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "vulcanusmon" },
          { card: "BT25-071", as: "ts" },
          { card: "BT25-081", as: "nearMatch" },
        ],
      },
      1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
    });
    await s.ready();
    expect(Array.from(s.perm("vulcanusmon").keywords)).toEqual(expect.arrayContaining(["Rush", "Link"]));
    expect(Array.from(s.perm("ts").keywords)).toEqual(expect.arrayContaining(["Rush", "Link"]));
    expect(s.perm("nearMatch").keywords).not.toContain("Rush");
    expect(s.perm("nearMatch").keywords).not.toContain("Link");
  });

  it("publicly playing Vulcanusmon links up to two cards, then scales De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "vulcanusmon" },
            { card: "BT25-100", as: "firstLink" },
            { card: "BT25-101", as: "secondLink" },
          ],
        },
        1: { battleArea: [{ card: "BT25-020", as: "opponent", under: ["BT24-009", "BT24-010", "BT10-013"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 7;
    preferred.push(s.inst("firstLink").instanceId, s.inst("secondLink").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcanusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("vulcanusmon").instanceId,
        ) && s.perm("vulcanusmon").linked.length === 2,
    );

    expect(s.perm("vulcanusmon").linked.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstLink").instanceId, s.inst("secondLink").instanceId]),
    );
    // Two linked cards each apply De-Digivolve 1, removing two sources while the legal Lv3 base remains.
    expect(s.perm("opponent").stack).toHaveLength(1);
  });
});
