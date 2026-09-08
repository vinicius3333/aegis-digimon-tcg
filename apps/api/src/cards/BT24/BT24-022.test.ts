import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-022.js";
import "../index.js";

describe("BT24-022 Ikkakumon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-022")).toMatchObject({
      cardId: "BT24-022",
      nameEn: "Ikkakumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Sea Beast", "Iliad", "TS"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    });
  });

  it("trashes two stack cards, then restricts an opponent Digimon by source stack count", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as unknown as Array<{
        kind: string;
        amount: number;
        fromTop: boolean;
        restriction: string;
        duration: string;
        target: { filter: { digivolutionCardsCompareToSource: string } };
      }>;
      expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[1].target.filter.digivolutionCardsCompareToSource).toBe("lte");
    }
  });

  it("keeps the inherited unsuspend-to-draw condition", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as unknown as {
      actions: Array<{ kind: string; event: string; actions: Array<{ condition: unknown }> }>;
    };
    const sub = inherited.actions[0];
    expect(sub).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended" });
    expect(sub.actions[0].condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "hand",
      op: "lte",
      value: 7,
    });
  });

  it("trashes the top two sources before applying the source-count suspension restriction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-022", as: "ikkakumon", under: ["BT24-020"] }] },
        1: {
          battleArea: [
            {
              card: "BT24-051",
              as: "threeSources",
              under: ["BT24-019", "BT24-022", "BT24-050"],
            },
            { card: "BT24-051", as: "twoSources", under: ["BT24-022", "BT24-050"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("threeSources").permanentId);
    const threeSourceIds = s.perm("threeSources").stack.map((card) => card.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ikkakumon"));

    expect(s.perm("threeSources").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(threeSourceIds.slice(-2)),
    );
    expect(s.perm("threeSources").stack.map((card) => card.instanceId)).toEqual(threeSourceIds.slice(0, 1));
    expect(s.perm("twoSources").stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "suspend")).toBe(false);
  });

  it("resolves both On Play clauses from a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-022", as: "ikkakumon" }] },
        1: { battleArea: [{ card: "BT24-050", as: "target", under: ["BT24-019", "BT24-022"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();
    const expectedTrashIds = s.perm("target").stack.map((card) => card.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ikkakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 0);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(expectedTrashIds));
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT24-050");
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
  });

  it("exposes Jamming and inherited draw only at seven or fewer cards, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-022", as: "ikkakumon" },
          { card: "BT24-050", as: "host", under: ["BT24-022"] },
        ],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ikkakumon"), "Jamming")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw with eight cards already in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-022"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws from a real owner-turn Active phase when the stacked host unsuspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-050", as: "host", suspended: true, under: ["BT24-022"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-013", "BT1-014", "BT1-015"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === "Active");
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    // The owner also takes the ordinary draw for this non-first turn; the inherited trigger
    // contributes the second card during the same Active phase.
    expect(s.state.players[0]!.hand).toHaveLength(9);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("enforces inherited unsuspend frequency publicly and resets next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-022"] }],
          hand: [
            { card: "BT24-050", as: "firstPlay" },
            { card: "BT24-050", as: "secondPlay" },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-009", as: "secondDraw" },
            { card: "BT1-009", as: "nextTurnDraw" },
          ],
        },
        1: {
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 20;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    preferred.push(hostId);

    for (const playAlias of ["firstPlay", "secondPlay"] as const) {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").isSuspended);
      expect(s.perm("host").isSuspended).toBe(true);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(playAlias).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.perm("host").isSuspended);
      expect(s.perm("host").isSuspended).toBe(false);
      if (playAlias === "firstPlay") {
        expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstDraw").instanceId);
        expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);
      } else {
        expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstDraw").instanceId);
        expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondDraw").instanceId);
        expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);
      }
    }

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === "Main");
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nextTurnDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-021", as: "tsBase" }],
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("tsBase").topCard.instanceId).toBe(s.inst("ikkakumon").instanceId);
    expect(s.perm("tsBase").stack.map((card) => card.instanceId)).toEqual([s.inst("tsBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("digivolves from a non-TS blue level 3 for its normal cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-031", as: "blueBase" }],
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
        deck: [{ card: "BT1-009", as: "normalDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("blueBase").topCard.instanceId).toBe(s.inst("ikkakumon").instanceId);
    expect(s.perm("blueBase").stack.map((card) => card.instanceId)).toEqual([s.inst("blueBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("normalDraw").instanceId);
  });

  it("keeps the TS restriction on the alternate evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]),
    );
  });

  it("rejects a non-TS source when the alternate cost is explicitly selected", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-031", as: "blueBase" }], hand: [{ card: "BT24-022", as: "ikkakumon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
  });
});
