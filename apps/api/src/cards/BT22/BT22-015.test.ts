import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-015.js";
import "../index.js";

describe("BT22-015 Omnimon", () => {
  it("keeps Blocker, both Decode modes, lowest-DP deletion, stack-local scaling, and optional attack", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 6, traits: ["CS"], cost: 5, isAlternate: true }]);
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { level: 6, names: ["Greymon"] },
          { level: 6, names: ["Garurumon"] },
        ],
      },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(3);
    const decodeReplacements = compiled.effects
      .filter((entry) => entry.trigger === "AllTurns")
      .flatMap((entry) => entry.actions)
      .filter((action) => action.kind === "Replacement");
    expect(decodeReplacements).toHaveLength(2);
    expect(decodeReplacements[0]).toMatchObject({
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          playedByDecode: true,
          target: { filter: { kind: ["Digimon"], levels: [3], colors: ["Red", "Black"] }, count: 1 },
        },
      ],
    });
    expect(decodeReplacements[1]).toMatchObject({
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          playedByDecode: true,
          target: { filter: { kind: ["Digimon"], levels: [3], colors: ["Blue", "Yellow"] }, count: 1 },
        },
      ],
    });
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      scaling: { per: 1, unit: "sameLevelDigivolutionPairs" },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false });
  });

  it("returns two Digimon for three level-4 and three level-5 stack cards, per Q4871", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-015",
              under: ["BT22-009", "BT22-009", "BT22-009", "BT22-011", "BT22-011", "BT22-011"],
              as: "omnimon",
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Blocker")).toBe(true);
  });

  it("does not use hidden source levels for same-level pair scaling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-015",
              as: "omnimon",
              under: [
                { card: "EX9-039", faceUp: false },
                { card: "EX9-039", faceUp: false },
                { card: "EX9-043", faceUp: false },
                { card: "BT22-009", faceUp: true },
                { card: "BT22-009", faceUp: true },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));

    // Only the two face-up level-4 sources form one readable pair; the two hidden EX9-039 sources
    // contribute no level information and therefore cannot create a second pair.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly ignores the hidden EX9 source when counting readable pairs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-070", as: "base" },
            { card: "BT1-044", as: "garurumon" },
          ],
          hand: [
            { card: "EX9-043", as: "ex9" },
            { card: "BT2-065", as: "war" },
            { card: "BT22-015", as: "omnimonHand" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          trash: [{ card: "BT1-070", as: "hiddenBase" }],
        },
        1: {
          battleArea: [
            { card: "BT1-053", as: "target" },
            { card: "BT1-054", as: "target2" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").permanentId;
    const targetInstanceId = s.perm("target").topCard.instanceId;
    const target2Id = s.perm("target2").permanentId;
    const target2InstanceId = s.perm("target2").topCard.instanceId;
    const hiddenBaseInstanceId = s.inst("hiddenBase").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ex9").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-043");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT1-070" && card.faceUp === false)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("war").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.perm("base").topCard.cardId === "BT2-065");
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("base").permanentId, s.perm("garurumon").permanentId],
        instanceId: s.inst("omnimonHand").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-015"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const omnimon = s.state.players[0]!.battleArea[0]!;
    expect(omnimon.stack.map((card) => card.cardId)).toEqual(["BT1-070", "BT1-070", "EX9-043", "BT2-065", "BT1-044"]);
    expect(omnimon.stack.find((card) => card.instanceId === hiddenBaseInstanceId)!.faceUp).toBe(false);
    expect(omnimon.stack.find((card) => card.instanceId === s.inst("base").instanceId)!.faceUp).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(targetInstanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([target2Id]);
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(target2InstanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("deletes exactly one lowest-DP opponent on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-015", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "lowest" },
            { card: "BT22-010", dp: 5000, as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("omnimon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
  });

  it("DNA digivolves the exact level-6 Greymon and Garurumon pair for 0 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-013", as: "greymon" },
            { card: "BT22-026", as: "garurumon" },
          ],
          hand: [{ card: "BT22-015", as: "omnimon" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greymon").permanentId, s.perm("garurumon").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-015"));

    const omnimon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT22-015");
    expect(omnimon?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT22-013", "BT22-026"]));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("rejects DNA material pairs that do not match both level-6 name clauses", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-013", as: "greymon" },
          { card: "BT22-011", as: "wrongLevel" },
        ],
        hand: [{ card: "BT22-015", as: "omnimon" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greymon").permanentId, s.perm("wrongLevel").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT22-015");
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("uses BT22-014's Rule Name Greymon alias as the DNA Greymon material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-014", as: "gaiomon" },
            { card: "BT22-026", as: "garurumon" },
          ],
          hand: [{ card: "BT22-015", as: "omnimon" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("gaiomon").permanentId, s.perm("garurumon").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-015"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("decodes only from Omnimon's own stack when a public effect removes it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-015", under: ["BT10-059", "BT16-016"], as: "omnimon" },
            { card: "BT22-020", under: ["BT23-048", "EX11-014"], as: "decoy" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // No player Intent currently produces an opponent-effect deletion; this named advance verb
    // is the public test seam for the production leave event (as used by other Decode tests).
    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("omnimon").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT10-059",
      "BT16-016",
      "BT22-020",
    ]);
    expect(s.perm("decoy").stack.map((card) => card.cardId)).toEqual(["BT23-048", "EX11-014"]);
  });
});
