import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-036.js";

describe("EX4-036 BlackRapidmon", () => {
  it("trashes digivolution cards until level three and then De-Digivolves one opponent Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 99, stopAtLevel: 3, fromTop: true });
    expect(actions?.[1]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent" } },
    });
  });
  it("gains Piercing when an effect suspends another opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { excludeSelf: true },
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
        },
      ],
    });
  });
  it("records complete compiled coverage", () => {
    expect(getCardDefinition("EX4-036")).toMatchObject({
      nameEn: "BlackRapidmon",
      colors: ["Green", "Black"],
      level: 5,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-036");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves from a Gargomon-named level-4 Digimon for the alternate cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-05", as: "gargomon" }],
          hand: [{ card: "EX4-036", as: "blackRapidmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gargomon").permanentId,
        instanceId: s.inst("blackRapidmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gargomon").topCard.cardId === "EX4-036");
    expect(s.perm("gargomon").topCard.cardId).toBe("EX4-036");
    expect(s.state.memory).toBe(0);
  });

  it("accepts a different green two-color level-4 route and rejects a level-3 route", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX4-035", as: "base" }], hand: [{ card: "EX4-036", as: "card" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX4-036");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "EX4-034", as: "base" }], hand: [{ card: "EX4-036", as: "card" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-036"]);
  });

  it("trashes sources through the level-3 boundary, then De-Digivolves an opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-036", as: "host" }] },
      1: {
        battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-014", "BT1-009"] }],
        security: ["BT1-013"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-014"]),
    );
  });

  ex4CardBehaviorTests("EX4-036");
});
