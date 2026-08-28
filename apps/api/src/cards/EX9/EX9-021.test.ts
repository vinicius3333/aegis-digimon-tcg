import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import compiled from "./EX9-021.js";

describe("EX9-021", () => {
  const source = {
    instanceId: "source",
    cardId: "EX9-021",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers the DNA digivolving protection and highest-level deletion effect", () =>
    expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1));
  it("does not impose an unprinted once-per-turn limit on the end-of-attack effect", () =>
    expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.OnEndAttack, source)[0]?.maxPerTurn).toBe(-1));

  it("encodes the complete behavior as compiled IR", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          restriction: "beAffected",
          byOpponentEffectsOnly: true,
          condition: { kind: "isDnaDigivolving" },
        },
        { kind: "Delete", target: { filter: { superlative: "highestLevel" }, count: "all" } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfAttack",
      optional: true,
      actions: [
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, bindResultAs: "firstPlayed" },
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, bindResultAs: "secondPlayed" },
        { kind: "SecurityManipulation", op: "addTop" },
      ],
    });
  });

  it("DNA digivolving deletes every opposing highest-level Digimon and grants Digimon-effect immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-013", as: "redMaterial" },
          { card: "EX9-020", as: "blueMaterial" },
        ],
        hand: [{ card: "EX9-021", as: "alterS" }],
      },
      1: {
        battleArea: [
          { card: "EX9-013", as: "highestA" },
          { card: "BT1-009", as: "lower" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("blueMaterial").permanentId],
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    const alterS = s.state.players[0]!.battleArea[0]!;
    expect(alterS.topCard.cardId).toBe("EX9-021");
    expect(observe(s.engine).hasRestriction(alterS, "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX9-013"]));
  });

  it("normal digivolution with a stack of at least 2 does not grant DNA immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-013", as: "alterS", under: ["BT1-009", "BT1-009"] }],
        hand: [{ card: "EX9-021", as: "evolver" }],
      },
      1: {
        battleArea: [
          { card: "EX9-013", as: "highest" },
          { card: "BT1-009", as: "lower" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alterS").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alterS").topCard?.cardId === "EX9-021" && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasRestriction(s.perm("alterS"), "beAffected", "Digimon")).toBe(false);
  });

  it("at End of Attack plays one Greymon and one Garurumon from its stack, then becomes top security", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-021", as: "alterS", under: ["AD1-001", "AD1-010"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const alterS = s.perm("alterS");
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, alterS, {
      attackerPermanentId: alterS.permanentId,
    });

    expect(s.state.players[0]!.security[0]!.cardId).toBe("EX9-021");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["AD1-001", "AD1-010"]),
    );
  });
});
