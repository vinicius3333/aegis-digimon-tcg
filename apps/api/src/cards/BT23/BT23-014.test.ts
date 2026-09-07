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

  it.each([
    ["On Play", EffectTiming.OnPlay],
    ["When Digivolving", EffectTiming.WhenDigivolving],
    ["When Attacking", EffectTiming.OnUseAttack],
  ] as const)("%s deletes at the exact scaled 12000-DP boundary", async (_label, timing) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-014", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "target" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    const targetId = s.perm("target").permanentId;
    const targetInstanceId = s.inst("target").instanceId;
    await advance(s.engine).fire(timing, s.perm("gallantmon"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("resolves its On Play deletion from a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("resolves the When Attacking deletion through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-014", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 8000 }], security: 1 },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("preserves a 13000-DP Digimon above the two-permanent scaled ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-014", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "AD1-006", as: "target" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallantmon"));
    await settle();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
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

  it("blocks a public opponent effect from playing a Digimon from trash while allowing its hand play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }], deck: ["BT1-001"] },
        1: {
          hand: [{ card: "BT11-086", as: "mervamon" }],
          trash: [{ card: "BT11-082", as: "trashTarget" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-014"));

    s.state.turnSeat = 1;
    s.state.memory = 11;
    await s.engine.recomputeContinuousEffects();
    const trashTargetId = s.inst("trashTarget").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT11-086"));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === trashTargetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === trashTargetId)).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT11-086")).toBe(false);
  });

  it("expires the public trash-play lock at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-014", as: "gallantmon" }], deck: ["BT1-001", "BT1-002"] },
        1: {
          hand: [
            { card: "BT11-086", as: "firstMervamon" },
            { card: "BT11-086", as: "secondMervamon" },
          ],
          trash: [
            { card: "BT11-082", as: "firstTarget" },
            { card: "BT11-082", as: "secondTarget" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-014"));
    await advance(s.engine).waitForMainPhase(1);

    s.state.memory = 11;
    const firstTargetId = s.inst("firstTarget").instanceId;
    const secondTargetId = s.inst("secondTarget").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstMervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT11-086"));
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstTargetId, secondTargetId]),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === firstTargetId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === secondTargetId)).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    s.state.memory = 11;
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
