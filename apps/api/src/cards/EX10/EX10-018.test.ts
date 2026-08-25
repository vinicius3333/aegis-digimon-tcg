import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-018.js";
import "../index.js";

const CARD_ID = "EX10-018";

describe("EX10-018 Astamon", () => {
  it("records the exact catalog, all evolution routes, under-Tamer play, Fortitude, and Piercing", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Wizard"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Psychemon"], cost: 5, isAlternate: true },
      { level: 4, texts: ["Save"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["underMyTamers"],
            payCost: false,
            optional: true,
            target: { filter: { controller: "mine", playCostLte: 4, keywords: ["Save"] }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Fortitude" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Piercing" }],
    });
  });

  it("On Play selects only a cost-4-or-lower Save-text card from under a Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT10-029", as: "eligible" },
                { card: "BT10-020", as: "overCost" },
                { card: "BT1-009", as: "noSave" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "astamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("astamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("eligible").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("overCost").instanceId, s.inst("noSave").instanceId]),
    );
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("eligible").instanceId);
    assertNoLoudGap(s);
  });

  it.each([
    ["green", "BT1-071"],
    ["purple", "BT10-074"],
  ])("uses the normal %s level-4 route for exactly 4 and resolves When Digivolving", async (_color, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT10-029", as: "eligible" }] },
          ],
          hand: [{ card: CARD_ID, as: "astamon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("astamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("eligible").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
  });

  it.each([
    ["Psychemon name", "EX10-015", 0, 5],
    ["level-4 Save text", "BT10-019", 1, 3],
  ])("uses the alternate %s route for exactly %i", async (_label, baseCard, requirementIndex, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: CARD_ID, as: "astamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = cost;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("astamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("rejects the Save-text route from an off-color level 4 without Save and allows refusing the play", async () => {
    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-033", as: "base" }],
        hand: [{ card: CARD_ID, as: "astamon" }],
      },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("astamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-071", as: "base" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT10-029", as: "eligible" }] },
          ],
          hand: [{ card: CARD_ID, as: "astamon" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 4;
    expect(
      declined.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: declined.perm("base").permanentId,
        instanceId: declined.inst("astamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.perm("base").topCard.cardId === CARD_ID);
    expect(declined.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("eligible").instanceId,
    );
  });

  it("replays through Fortitude only when deleted with a digivolution card", async () => {
    const withSource = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "astamon", under: [{ card: "BT1-071", as: "source" }] }] },
    });
    await withSource.ready();
    expect(observe(withSource.engine).hasKeyword(withSource.perm("astamon"), "Fortitude")).toBe(true);
    const astamonId = withSource.inst("astamon").instanceId;
    expect(
      await advance(withSource.engine).verb.deletePermanent([withSource.perm("astamon").permanentId], "byEffect"),
    ).toBe(1);
    await settle(() => withSource.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === astamonId));
    expect(withSource.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      withSource.inst("source").instanceId,
    );

    const withoutSource = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "astamon" }] } });
    const noSourceId = withoutSource.inst("astamon").instanceId;
    expect(
      await advance(withoutSource.engine).verb.deletePermanent([withoutSource.perm("astamon").permanentId], "byEffect"),
    ).toBe(1);
    expect(withoutSource.state.players[0]!.battleArea).toHaveLength(0);
    expect(withoutSource.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(noSourceId);
  });

  it("grants inherited Piercing after a realistic two-step evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-071", as: "base" }],
        hand: [
          { card: CARD_ID, as: "astamon" },
          { card: "BT1-080", as: "titamon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("astamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-080");

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-071", CARD_ID]));
    expect([...s.perm("base").keywords]).toContain("Piercing");
    assertNoLoudGap(s);
  });
});
