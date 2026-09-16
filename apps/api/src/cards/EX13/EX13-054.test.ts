import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-054.js";
import "../index.js";

const CARD_ID = "EX13-054";

describe("EX13-054 Nanimon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Nanimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 3000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Invader"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 2 },
        { color: "Yellow", level: 3, memoryCost: 2 },
      ],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects).toHaveLength(5);

    // [Security] At the end of the battle, play this card without paying the cost.
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { isSelf: true } }],
        },
      ],
    });

    // [On Play] [On Deletion] 1 of your opponent's Digimon can't attack players until their turn ends.
    for (const index of [1, 2]) {
      expect(compiled.effects[index]).toMatchObject({
        trigger: index === 1 ? "OnPlay" : "OnDeletion",
        actions: [
          {
            kind: "Restrict",
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }

    // [Rule] Trait: Has [Mutant] Type.
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Mutant"], duration: "permanent" }],
    });

    // Inherited: [All Turns] This Digimon gets +1000 DP.
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }],
    });
  });

  it("[On Play] stops one opposing Digimon attacking players but not attacking Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "nanimon" }], deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "restricted" }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("nanimon"));
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(false);
  });

  it("[On Deletion] applies the same restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "nanimon" }], deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "restricted" }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("nanimon"));
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
  });

  it("a restricted Digimon's player attack is refused through the public intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "nanimon" }], deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "restricted" }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("nanimon"));
    await settle();

    s.state.turnSeat = 1;
    s.state.memory = 1;
    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("restricted").permanentId,
      target: { kind: "player" },
    });

    expect(result).not.toEqual({ ok: true });
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("plays itself from security at the end of a real security battle", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: CARD_ID, as: "nanimon" }], deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 9000 }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    const nanimonInstanceId = s.inst("nanimon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === nanimonInstanceId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(nanimonInstanceId);
    // The play is free: the defender's memory gauge is untouched by it.
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
  });

  it("carries the [Mutant] trait granted by its [Rule] clause", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "nanimon" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("nanimon"), "Mutant")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("nanimon"), "Invader")).toBe(true);
  });

  it("passes +1000 DP up as an inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "top", under: [CARD_ID] }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();

    const printedDp = getCardDefinition("BT1-020")!.dp!;
    expect(s.perm("top").currentDP).toBe(printedDp + 1000);
  });

  it("digivolves from a black Lv.3 for 2 and refuses an illegal source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "base" }],
        hand: [{ card: CARD_ID, as: "nanimon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }],
      },
      1: { deck: ["BT1-011"] },
    });
    legal.state.memory = 5;
    await legal.ready();
    const baseInstanceId = legal.perm("base").topCard.instanceId;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("nanimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("nanimon").instanceId);
    expect(legal.state.memory).toBe(3);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: CARD_ID, as: "nanimon" }] },
      1: { deck: ["BT1-011"] },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("nanimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(5);
  });
});
