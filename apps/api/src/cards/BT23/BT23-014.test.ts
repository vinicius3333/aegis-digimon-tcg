import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import "../BT11/BT11-086.js";
import { compiled } from "./BT23-014.js";

describe("BT23-014 Gallantmon", () => {
  it("matches the catalog and keeps simultaneous restriction and deletion clauses separate", () => {
    expect(getCardDefinition("BT23-014")).toMatchObject({
      cardId: "BT23-014",
      nameEn: "Gallantmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
      effectText:
        "[Digivolve] Lv.5 w/[CS]\u00a0trait: Cost 3 \n\n[On Play] [When Digivolving] Until your opponent's turn ends, their effects can't play Digimon or Tamers from the trash.\n[On Play] [When Digivolving] [When Attacking] Delete 1 of your opponent's Digimon with 8000 DP or less. For each of their Digimon and Tamers, add 2000 to this DP deletion effect's maximum.",
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effects = compiled.effects.filter((entry) => entry.trigger === trigger);
      expect(effects).toHaveLength(2);
      expect(effects[0]!.actions).toEqual([
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon", "Tamer"], zone: "trash" },
          mode: "play",
          duration: "untilOpponentTurnEnd",
          byEffectOnly: true,
        },
      ]);
      expect(effects[1]!.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } } },
        dpCeilingScaling: {
          per: 1,
          amount: 2000,
          unit: "cards",
          filter: { controller: "opponent", kind: ["Digimon", "Tamer"], zone: "battleArea" },
        },
      });
    }
    expect(compiled.effects.filter((entry) => entry.trigger === "WhenAttacking")).toHaveLength(1);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  /**
   * Public scaled-ceiling proofs. The opponent fields one Digimon and one Tamer, so
   * Q5229's maximum is 8000 + 2 x 2000 = 12000: a 12000-DP Digimon dies, a 13000-DP one lives.
   */
  it("deletes at the scaled 12000-DP ceiling from a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-080", dp: 12000, as: "target" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("tamer").permanentId]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("deletes at the scaled 12000-DP ceiling from a public CS digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-023", as: "base" }],
          hand: [{ card: "BT23-014", as: "gallantmon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", dp: 12000, as: "target" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("tamer").permanentId]);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(s.inst("base").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("deletes at the scaled 12000-DP ceiling from a public attack but spares 13000", async () => {
    for (const [dp, deleted] of [
      [12000, true],
      [13000, false],
    ] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT23-014", as: "gallantmon" }] },
          1: {
            battleArea: [
              { card: "BT1-080", dp, as: "target" },
              { card: "BT1-085", as: "tamer" },
            ],
            security: ["BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      const targetId = s.perm("target").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("gallantmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      if (deleted) await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
      else await settle();
      expect(
        s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
        `dp ${dp}`,
      ).toBe(!deleted);
      expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(
        deleted,
      );
    }
  });

  it("keeps the 8000 base ceiling when the opponent fields nothing else", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-080", dp: 10000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    // One opponent Digimon on the board raises the ceiling to 10000, so a 10000-DP body dies.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("scopes the trash floodgate to the opponent's effects and includes breeding plays, per Q5226-Q5228/Q6249", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-014", as: "gallantmon" }],
        trash: [
          { card: "BT1-009", as: "mine" },
          { card: "BT1-009", as: "mineBreeding" },
        ],
      },
      1: {
        trash: [
          { card: "BT1-009", as: "theirs" },
          { card: "BT1-085", as: "theirTamer" },
        ],
      },
    });
    const driver = advance(s.engine);
    await driver.fire(EffectTiming.OnPlay, s.perm("gallantmon"));
    const ledger = driver.ledgers.continuous;

    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", true, "trash")).toBe(true);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-085")!, "play", true, "trash")).toBe(true);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", true, "hand")).toBe(false);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-109")!, "play", true, "trash")).toBe(false);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", false, "trash")).toBe(false);

    driver.verb.enterEffectResolution(0);
    try {
      await driver.verb.playInstances([s.inst("theirs").instanceId]);
    } finally {
      driver.verb.leaveEffectResolution();
    }
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("theirs").instanceId),
    ).toBe(true);

    driver.verb.enterEffectResolution(1);
    try {
      await driver.verb.playInstances([s.inst("mine").instanceId]);
      await driver.verb.playInstances([s.inst("mineBreeding").instanceId], undefined, { breeding: true });
    } finally {
      driver.verb.leaveEffectResolution();
    }
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("mine").instanceId, s.inst("mineBreeding").instanceId]),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();

    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", true, "trash")).toBe(true);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(ledger.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", true, "trash")).toBe(false);
  });

  it("expires the public trash-play lock at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          hand: [
            { card: "BT11-086", as: "firstMervamon" },
            { card: "BT11-086", as: "secondMervamon" },
          ],
          trash: [
            { card: "BT11-082", as: "firstTarget" },
            { card: "BT11-082", as: "secondTarget" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-014"));
    await advance(s.engine).waitForMainPhase(1);

    s.state.memory = 10;
    const firstTargetId = s.inst("firstTarget").instanceId;
    const secondTargetId = s.inst("secondTarget").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstMervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT11-086"));
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstTargetId, secondTargetId]),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === firstTargetId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === secondTargetId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondMervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.filter((p) => p.topCard?.cardId === "BT11-086").length === 2);
    expect(
      s.state.players[1]!.battleArea.some(
        (p) => p.topCard?.instanceId === firstTargetId || p.topCard?.instanceId === secondTargetId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toEqual(
      expect.arrayContaining([firstTargetId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondTargetId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("climbs a public Lv.3 -> Lv.4 -> Lv.5 [CS] stack into Gallantmon, drawing once per step", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-019", as: "veemon" },
            { card: "BT22-022", as: "veedramon" },
            { card: "BT22-023", as: "aero" },
            { card: "BT23-014", as: "gallantmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014", "BT1-027", "BT1-028", "BT1-045"],
        },
        // A single level-6 body: AeroVeedramon's mandatory "return 1 level 4 or lower" finds no
        // target, so only Gallantmon's own deletion can change this board.
        1: { battleArea: [{ card: "BT1-080", dp: 10000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("veemon").topCard!.cardId).toBe("BT22-019");

    const steps = [
      { alias: "veedramon", cardId: "BT22-022", dp: 5000, stack: ["BT22-019"] },
      { alias: "aero", cardId: "BT22-023", dp: 7000, stack: ["BT22-019", "BT22-022"] },
      { alias: "gallantmon", cardId: "BT23-014", dp: 11000, stack: ["BT22-019", "BT22-022", "BT22-023"] },
    ] as const;
    for (const step of steps) {
      s.state.memory = 8;
      const handBefore = s.state.players[0]!.hand.length;
      const deckBefore = s.state.players[0]!.deck.length;
      const instanceId = s.inst(step.alias).instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("veemon").permanentId,
          instanceId,
          useAlternateCost: true,
        }),
        step.cardId,
      ).toEqual({ ok: true });
      await settle(() => s.perm("veemon").topCard?.instanceId === instanceId);
      // Source-stack identity: every earlier source stays beneath, bottom-most first.
      expect(
        s.perm("veemon").stack.map((card) => card.cardId),
        step.cardId,
      ).toEqual(step.stack);
      expect(s.perm("veemon").topCard!.cardId).toBe(step.cardId);
      expect(s.perm("veemon").currentDP, step.cardId).toBe(step.dp);
      // Bonus draw: one card leaves the deck and the net hand size is unchanged
      // (one card spent on the digivolution, one drawn).
      expect(s.state.players[0]!.deck.length, step.cardId).toBe(deckBefore - 1);
      expect(s.state.players[0]!.hand.length, step.cardId).toBe(handBefore);
      if (step.alias === "gallantmon") expect(s.state.memory, step.cardId).toBe(8 - 3);
    }

    // Gallantmon's own [When Digivolving] deletion is the only thing that can clear the board:
    // one opponent permanent raises the 8000 ceiling to exactly 10000.
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it.each([
    { label: "exact [CS] level 5", card: "BT22-023", accepted: true },
    { label: "level 5 whose only near-match is the [Abadin Electronics] substring", card: "BT17-036", accepted: false },
    { label: "level 5 with an unrelated trait", card: "BT1-041", accepted: false },
    { label: "level 4 with the [CS] trait", card: "BT22-022", accepted: false },
    { label: "level 6 with the [CS] trait", card: "BT22-013", accepted: false },
  ])("accepts only the $label host for the cost-3 [CS] route", async ({ card, accepted }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card, as: "base" }],
          hand: [{ card: "BT23-014", as: "gallantmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const gallantmonId = s.inst("gallantmon").instanceId;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: gallantmonId,
      useAlternateCost: true,
    });
    expect(result.ok, card).toBe(accepted);
    await settle();
    if (accepted) {
      expect(s.perm("base").topCard!.instanceId, card).toBe(gallantmonId);
      expect(
        s.perm("base").stack.map((c) => c.cardId),
        card,
      ).toEqual([card]);
      expect(s.state.memory, card).toBe(3);
    } else {
      expect(s.perm("base").topCard!.cardId, card).toBe(card);
      expect(
        s.state.players[0]!.hand.map(({ instanceId }) => instanceId),
        card,
      ).toContain(gallantmonId);
      expect(s.state.memory, card).toBe(6);
    }
  });

  it("digivolves for 3 from an off-color level-5 CS Digimon and rejects an off-color non-CS base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT22-023", as: "base" }],
        hand: [{ card: "BT23-014", as: "gallantmon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    const baseId = legal.inst("base").instanceId;
    const gallantmonId = legal.inst("gallantmon").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === gallantmonId);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(legal.perm("base").topCard?.instanceId).toBe(gallantmonId);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-041", as: "base" }], hand: [{ card: "BT23-014", as: "gallantmon" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
