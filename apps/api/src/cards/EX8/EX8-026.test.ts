import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/EX12/EX12-028.js";
import "./index.js";
import { compiled } from "./EX8-026.js";

describe("EX8-026", () => {
  it("matches the complete printed catalog identity and text", () => {
    const card = getCardDefinition("EX8-026");
    expect(card).toMatchObject({
      cardId: "EX8-026",
      nameEn: "MetalSeadramon",
      colors: ["Blue", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "DS", "Aquatic"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(card?.effectText).toContain("[Hand] [Counter] ＜Blast Digivolve＞");
    expect(card?.effectText).toContain("＜De-Digivolve1＞ 1 of your opponent's Digimon");
    expect(card?.effectText).toContain("play cost of 7 or less");
    expect(card?.effectText).toContain("While you have 1 or more memory, none of your opponent's Digimon can suspend.");
    expect(card?.effectText).toContain("[Rule] Trait: Has the [Aquatic] type.");
  });
  it("has Blast Digivolve, de-digivolves and bottom-decks an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      actions: [],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "DeDigivolve",
        amount: 1,
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      {
        kind: "Return",
        to: "deckBottom",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 7 } },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual(
      compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions,
    );
  });
  it("prevents opposing Digimon from suspending while you have at least 1 memory and grants Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Restrict",
      target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
      restriction: "suspend",
      duration: "permanent",
      while: { kind: "memoryAtLeast", value: 1, controller: "mine" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      tokens: ["Aquatic"],
    });
  });
  it("applies and removes the live opposing suspend restriction at the memory threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("de-digivolves first, then bottom-decks the newly exposed play-cost-3 Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: [{ card: "BT1-024", as: "base" }] }] },
      },
      { autoSelectCards: true },
    );
    const baseId = s.inst("base").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metal"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(baseId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-004")).toBe(true);
  });

  it("does not bottom-deck an opposing Digimon above the inclusive play-cost-7 limit", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-002", as: "overLimit" }], deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metal"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-002")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it.each([
    ["EX8-024", "blueBase"],
    ["EX12-028", "blackBase"],
  ] as const)("uses the standard %s level-5 evolution route", async (baseCard, alias) => {
    const s = setupEngine({
      0: { battleArea: [{ card: baseCard, as: alias }], hand: [{ card: "EX8-026", as: "metal" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(alias).permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(alias).topCard?.cardId === "EX8-026");
    expect(s.state.memory).toBe(0);
    expect(s.perm(alias).stack.map((card) => card.cardId)).toEqual([baseCard]);
  });

  it("Blast Digivolves from hand over a legal DS level 5 during Counter", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
        security: ["BT1-009"],
        deck: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "EX8-024", as: "base" }],
        hand: [{ card: "EX8-026", as: "metal" }],
        security: ["BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("metal").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-026");

    expect(s.perm("base").topCard.cardId).toBe("EX8-026");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("attacker").instanceId);
  });

  it("blocks an opposing attack at +1 memory, including the Blitz legality path (Q3892–Q3893)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "BT5-017", as: "blitz" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    // Memory is signed from the turn player's perspective; -1 means the
    // non-turn owner (the MetalSeadramon controller) has 1 memory.
    s.state.memory = -1;
    await s.ready();
    // Crossed memory opens the engine's normal Blitz confirmation window;
    // accept that window so the following intent reaches attack legality,
    // where EX8-026's suspend prohibition is asserted.
    (s.engine as unknown as { checkTurnEndAfterVerb: () => void }).checkTurnEndAfterVerb();
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("blitz").permanentId));
    expect(s.state.phase).toBe("Main");
    expect(s.engine.hasAcceptedBlitzAttack(s.perm("blitz").permanentId)).toBe(true);

    expect(observe(s.engine).isRestricted(s.perm("blitz"), "suspend")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("uses the source owner's side of the memory gauge off-turn (Q3892)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
      1: { battleArea: [{ card: "BT5-009", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("uses the level-5 DS route for 3 and resolves the same removal sequence", async () => {
    expect(digivolutionRequirementsFor("EX8-026")).toContainEqual({
      level: 5,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-024", as: "megaSeadramon" }], hand: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-024"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaSeadramon").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("megaSeadramon"), "Aquatic")).toBe(true);
  });
});
