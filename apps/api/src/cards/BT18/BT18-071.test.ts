import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT11/BT11-014.js";
import { compiled } from "./BT18-071.js";

describe("BT18-071 ShadowSeraphimon", () => {
  it("matches the catalog and carries every printed clause in full IR", () => {
    expect(getCardDefinition("BT18-071")).toMatchObject({
      cardId: "BT18-071",
      nameEn: "ShadowSeraphimon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Seraph", "Three Great Angels"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
        { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "DeDigivolve",
              amount: 3,
              target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
            },
          ],
        })),
        {
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttackTargetSwitched",
              actions: [{ kind: "ModifyDP", amount: -5000, duration: "forTheTurn" }],
            },
          ],
        },
        {
          trigger: "Rule",
          actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Three Great Angels"] }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Seraphimon"], cost: 1, isAlternate: true },
        {
          namesExact: ["Sephirothmon"],
          minNameStackCount: 1,
          minNameStackNames: ["Mercurymon"],
          cost: 4,
          isAlternate: true,
        },
      ],
    });
  });

  it("naturally plays for 7, de-digivolves exactly one opposing Digimon by 3, and has Blocker", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-071", as: "shadow" }] },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shadow").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").topCard!.cardId).toBe("BT1-030");
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(s.perm("shadow"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("shadow"), "Three Great Angels")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally evolves from Seraphimon for the alternate cost and resolves When Digivolving De-Digivolve3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-063", as: "seraphimon" }],
          hand: [{ card: "BT18-071", as: "shadow" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("seraphimon").permanentId,
        instanceId: s.inst("shadow").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seraphimon").topCard?.cardId === "BT18-071");

    expect(s.state.memory).toBe(2);
    expect(s.perm("seraphimon").stack.map(({ cardId }) => cardId)).toContain("BT1-063");
    expect(s.perm("target").topCard!.cardId).toBe("BT1-030");
    expect(observe(s.engine).hasKeyword(s.perm("seraphimon"), "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally evolves from Sephirothmon only when a Mercurymon card is in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-066", as: "sephirothmon", under: ["BT18-064"] }],
          hand: [{ card: "BT18-071", as: "shadow" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030", "BT1-032", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephirothmon").permanentId,
        instanceId: s.inst("shadow").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sephirothmon").topCard?.cardId === "BT18-071");

    expect(s.state.memory).toBe(0);
    expect(s.perm("sephirothmon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-064", "BT18-066"]);
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("rejects the Sephirothmon alternate route when no Mercurymon card is in the stack", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-066", as: "sephirothmon" }],
        hand: [{ card: "BT18-071", as: "shadow" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephirothmon").permanentId,
        instanceId: s.inst("shadow").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("sephirothmon").topCard?.cardId).toBe("BT18-066");
    expect(s.state.memory).toBe(4);
  });

  it("naturally Blast Digivolves from hand in the opponent's attack and resolves the counter timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-063", as: "seraphimon" }],
          hand: [{ card: "BT18-071", as: "shadow" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", under: ["BT1-001"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));

    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("shadow").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seraphimon").topCard?.cardId === "BT18-071");

    expect(s.perm("attacker").topCard!.cardId).toBe("BT1-001");
    expect(observe(s.engine).hasKeyword(s.perm("seraphimon"), "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally triggers the all-turns once-per-turn DP reduction when Raid changes an attack target", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-071", as: "shadow" },
            { card: "BT11-014", as: "raider", dp: 1000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "initialTarget", dp: 10000 },
            { card: "BT1-010", as: "highestTarget", dp: 20000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("highestTarget").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "permanent", permanentId: s.perm("initialTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("highestTarget").currentDP === 15000);

    expect(s.perm("highestTarget").currentDP).toBe(15000);
    expect(s.perm("initialTarget").currentDP).toBe(10000);
    assertNoLoudGap(s);
  });
});
