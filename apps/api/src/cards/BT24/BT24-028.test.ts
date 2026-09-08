import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-028.js";
import "../index.js";

describe("BT24-028 Divermon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-028")).toMatchObject({
      cardId: "BT24-028",
      nameEn: "Divermon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Aquabeast", "Titan", "TS"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the qualifying hand placement on entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as {
        kind: string;
        cost: { kind: string; destination: string; position: string; optional?: unknown; abortOnDecline?: unknown };
        abortOnDecline?: unknown;
        additionalEffect?: unknown;
      };
      expect(action.kind).toBe("GainKeyword");
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.abortOnDecline).toBe(true);
      expect(action.additionalEffect).toMatchObject({ kind: "GrantStatic", modifier: "cannotBeDeletedInBattle" });
    }
  });

  it("keeps the inherited TS play effect scoped to this stack", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as {
      kind: string;
      from?: string[];
      fromOwnDigivolutionStack?: boolean;
      optional?: boolean;
      target: { filter: unknown };
    };
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      optional: true,
    });
    expect(action.target.filter).toMatchObject({ colors: ["Blue"], levelComparison: { op: "lte", value: 4 } });
  });

  it("uses an exact Neptunemon target for the free unsuspend evolution", () => {
    const action = (
      compiled.effects.find((effect) => effect.trigger === "YourTurn") as {
        actions: Array<{
          actions: Array<{
            kind: string;
            from?: string[];
            payCost?: boolean;
            optional?: boolean;
            into: { nameOrTrait?: unknown };
          }>;
        }>;
      }
    ).actions[0]!.actions[0]!;
    expect(action).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true });
    expect(action.into.nameOrTrait).toEqual([{ tokens: ["Neptunemon"], match: "nameExact" }]);
  });

  it("pays the placement cost before granting Blocker and battle-deletion immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "divermon" }],
          hand: [{ card: "BT24-027", as: "placed" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));

    expect(s.perm("divermon").stack[0]?.instanceId).toBe(s.inst("placed").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("divermon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("divermon"), "beDeletedInBattle")).toBe(true);
  });

  it("grants neither entry benefit when the placement cost is unavailable", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-028", as: "divermon" }] } });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));

    expect(observe(s.engine).hasKeyword(s.perm("divermon"), "Blocker")).toBe(false);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("divermon").permanentId], "byBattle")).toBe(1);
  });

  it("publicly free-evolves into exact Neptunemon during the Active phase (Q5608)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "divermon", suspended: true }],
          hand: [{ card: "BT24-030", as: "neptunemon" }],
          deck: [{ card: "BT1-014", as: "evolutionDraw" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("divermon").topCard.instanceId === s.inst("neptunemon").instanceId);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId));

    expect(s.state.memory).toBe(5);
    expect(s.perm("divermon").topCard.instanceId).toBe(s.inst("neptunemon").instanceId);
    expect(s.perm("divermon").stack.map((card) => card.instanceId)).toEqual([s.inst("divermon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not free-evolve into another legal blue level-6 target", async () => {
    expect(getCardDefinition("ST2-11")).toMatchObject({
      cardId: "ST2-11",
      nameEn: "MetalGarurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "divermon", suspended: true }],
          hand: [{ card: "ST2-11", as: "wrongTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.phase === Phase.Main);

    expect(s.perm("divermon").topCard.instanceId).toBe(s.inst("divermon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTarget").instanceId);
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("inherited play removes a level 4 blue TS card from this stack only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "host", under: [{ card: "BT24-027", as: "played" }, "BT24-028"] },
            { card: "BT24-028", as: "other", under: ["BT24-027"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
    const count = s.state.players[0]!.battleArea.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.battleArea).toHaveLength(count);
    expect(s.perm("other").stack.map((card) => card.cardId)).toContain("BT24-027");
  });

  it.each([
    ["Aqua in trait", "BT12-025", 0],
    ["Sea Animal trait", "BT1-033", 1],
    ["TS trait", "BT24-010", 2],
  ])("digivolves from a level 4 card with %s for cost 3", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-028", as: "divermon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("divermon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("divermon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("uses the normal blue level-4 evolution route for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-027", as: "base" }],
        hand: [
          { card: "BT24-028", as: "divermon" },
          { card: "BT24-027", as: "placed" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("divermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("divermon").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("placed").instanceId,
      s.inst("base").instanceId,
    ]);
  });

  it("rejects a normal evolution from a non-blue level-4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "base" }], hand: [{ card: "BT24-028", as: "divermon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("divermon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("divermon").instanceId);
  });

  it("plays the inherited level-4 blue TS card through a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-030",
              as: "host",
              under: [{ card: "BT24-027", as: "played" }, "BT24-028"],
            },
          ],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("played").instanceId);
  });
});
