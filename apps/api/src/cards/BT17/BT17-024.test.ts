import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-024.js";
import "./index.js";

const LEVEL_3_BLUE = "BT1-029";
const LEVEL_3_RED = "BT1-011";

const placementCost = {
  kind: "place",
  target: {
    filter: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] },
    count: 1,
    from: ["hand"],
  },
  raw: "By placing 1 level 3 blue Digimon card from your hand as this Digimon's bottom digivolution card",
  destination: "digivolutionStack",
  position: "bottom",
  host: "self",
};

const grantJamming = {
  kind: "GainKeyword",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
  keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
  duration: "forTheTurn",
  cost: placementCost,
  optional: true,
  abortOnDecline: true,
};

describe("BT17-024 Seasarmon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-024")).toMatchObject({
      cardId: "BT17-024",
      nameEn: "Seasarmon",
      colors: ["Blue"],
      level: 4,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      effectText:
        "[On Play] [When Digivolving] By placing 1 level 3 blue Digimon card from your hand as this Digimon's bottom digivolution card, 1 of your Digimon gains ＜Jamming＞for the turn.",
      inheritedEffectText: "＜Jamming＞.",
    });
    expect(compiled.effects).toEqual([
      { trigger: "OnPlay", actions: [grantJamming] },
      { trigger: "WhenDigivolving", actions: [grantJamming] },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("places the level 3 blue Digimon at the bottom of its own stack and grants Jamming on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: LEVEL_3_BLUE, as: "material" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const materialId = s.inst("material").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seasarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("seasarmon").stack.some((card) => card.instanceId === materialId));

    expect(s.perm("seasarmon").stack.map((card) => card.instanceId)).toEqual([materialId]);
    expect(s.perm("seasarmon").topCard!.cardId).toBe("BT17-024");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(true);
  });

  it("can grant the Jamming to another of your Digimon instead of itself", async () => {
    // Steer the "1 of your Digimon" choice onto the ally: proving the target is not
    // hard-wired to the source needs the grant to land somewhere else.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ally" }],
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: LEVEL_3_BLUE, as: "material" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 6;
    const materialId = s.inst("material").instanceId;
    const allyId = s.perm("ally").permanentId;
    preferInstanceIds.push(s.perm("ally").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seasarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("seasarmon").stack.some((card) => card.instanceId === materialId));

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(false);
    expect(allyId).toBe(s.perm("ally").permanentId);
  });

  it("places the level 3 blue Digimon below the digivolution base when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEVEL_3_BLUE, as: "base" }],
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: "BT17-021", as: "material" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const materialId = s.inst("material").instanceId;
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === materialId));

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([materialId, baseInstanceId]);
    expect(s.perm("base").topCard!.cardId).toBe("BT17-024");
    expect(s.state.memory).toBe(0);
    // The digivolution bonus draw is the only card left in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });

  it("loses the granted Jamming once the turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEVEL_3_BLUE, as: "base" }],
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: "BT17-021", as: "material" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const materialId = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Jamming"));
    expect(s.perm("base").stack.some((card) => card.instanceId === materialId)).toBe(true);

    // Paying the digivolution cost hands the turn over on its own; the expiry is
    // asserted on the far side of that real turn boundary.
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses to digivolve from a source outside its printed blue level 3 cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEVEL_3_RED, as: "redBase" }],
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: LEVEL_3_BLUE, as: "material" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).not.toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard?.cardId === LEVEL_3_RED);

    expect(s.perm("redBase").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.memory).toBe(6);
  });

  it("grants no Jamming when the hand holds no level 3 blue Digimon card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: LEVEL_3_RED, as: "wrongColor" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const wrongColorId = s.inst("wrongColor").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seasarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-024"));

    expect(s.perm("seasarmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([wrongColorId]);
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(false);
  });

  it("keeps the card in hand and grants nothing when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: LEVEL_3_BLUE, as: "material" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const materialId = s.inst("material").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seasarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-024"));

    expect(s.decisions.some((decision) => decision.req.kind === "optional")).toBe(true);
    expect(s.perm("seasarmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([materialId]);
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(false);
  });

  it("grants inherited Jamming to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-025", as: "host", under: ["BT17-024"] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
