import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-025.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = observe(s.engine).cardSource(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-025/"))!
    .effectKey;
}

describe("BT23-025 MarineAngemon", () => {
  it("returns the lowest-level opposing Digimon on play and when digivolving", () => {
    expect(getCardDefinition("BT23-025")).toMatchObject({
      cardId: "BT23-025",
      nameEn: "MarineAngemon",
      colors: ["Blue", "Yellow"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 3 },
        { color: "Yellow", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Fairy", "CS"],
    });
    expect(compiled.effects.filter(({ trigger }) => ["OnPlay", "WhenDigivolving"].includes(trigger))).toHaveLength(2);
    expect(compiled.effects.find(({ trigger }) => trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      target: { filter: { superlative: "lowestLevel" } },
    });
  });

  it("defers the Security play until the security battle ends and schedules turn-end deletion", async () => {
    const security = compiled.effects.find(({ trigger }) => trigger === "Security")!;
    expect(security.actions).toEqual([
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenSecurityBattleEnded",
        once: true,
        actions: [
          expect.objectContaining({ kind: "PlayWithoutCost", payCost: false }),
          expect.objectContaining({ kind: "DelayedDeletePlayed" }),
        ],
      }),
    ]);
    expect(security.timing).toBe("endOfBattle");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gates the entire hand Main behind a CS permanent and one payment of 5, per Q5253-Q5254", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "cs" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
          deck: Array(30).fill("BT1-011"),
        },
        1: { battleArea: [{ card: "BT23-016", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marine = s.inst("marine");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === marine.instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(marine.instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    const blocked = setupEngine({ 0: { hand: [{ card: "BT23-025", as: "marine" }] } });
    blocked.state.memory = 5;
    await blocked.ready();
    const blockedMarine = blocked.inst("marine");
    expect(
      blocked.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: blockedMarine.instanceId,
        effectKey: handMainEffectKey(blocked, blockedMarine),
      }),
    ).toMatchObject({ ok: false });
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blockedMarine.instanceId);
    expect(blocked.state.memory).toBe(5);
  });

  it.each([
    ["own CS Tamer", 0, "BT23-082", true],
    ["own non-CS Tamer", 0, "BT1-084", false],
    ["opponent-only CS Tamer", 1, "BT23-082", false],
  ] as const)("requires a controller-owned CS permanent: %s", async (_label, tamerSeat, tamerCard, succeeds) => {
    const s = setupEngine(
      {
        0: {
          battleArea: tamerSeat === 0 ? [{ card: tamerCard, as: "tamer" }] : [],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
        },
        1: {
          battleArea: [
            { card: "BT23-016", as: "target" },
            ...(tamerSeat === 1 ? [{ card: tamerCard, as: "tamer" }] : []),
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marineId = s.inst("marine").instanceId;
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: marineId,
      effectKey: handMainEffectKey(s, s.inst("marine")),
    });
    expect(result.ok).toBe(succeeds);
    await settle();
    expect(s.state.memory).toBe(succeeds ? 0 : 5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
      succeeds ? [marineId, s.inst("oldTop").instanceId] : [s.inst("oldTop").instanceId],
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(succeeds ? [] : [marineId]);
  });

  it("publicly evolves from a CS level-5 source for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "source" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const sourceId = s.inst("source").instanceId;
    const marineId = s.inst("marine").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("source").permanentId, instanceId: marineId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === marineId);
    expect(s.perm("source").stack[0]!.instanceId).toBe(sourceId);
    expect(s.state.memory).toBe(2);
  });

  it("publicly evolves onto a layered level-5 host, draws one, and returns one lowest tied enemy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "host", under: ["BT23-020"] }],
          hand: [{ card: "BT23-025", as: "marine" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lowestA" },
            { card: "BT23-017", as: "lowestB" },
            { card: "BT23-018", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const sourceId = s.inst("host").instanceId;
    const underId = s.perm("host").stack[0]!.instanceId;
    const marineId = s.inst("marine").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("host").permanentId, instanceId: marineId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === marineId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([underId, sourceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.length).toBe(1);
    expect(s.state.players[1]!.hand[0]!.instanceId).toBe(s.inst("lowestA").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("lowestB").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("higher").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(2);
  });

  it("pays and places itself when there are zero opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "cs" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marineId = s.inst("marine").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marineId,
        effectKey: handMainEffectKey(s, s.inst("marine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === marineId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(marineId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === marineId)).toBe(false);
  });

  it("does not place itself in security when the 5-memory cost is unpayable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-017", as: "cs" }], hand: [{ card: "BT23-025", as: "marine" }] },
    });
    s.state.memory = -6;
    await s.ready();
    const marine = s.inst("marine");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(marine.instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("pays the mandatory Main cost after declaration", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "cs" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
        },
        1: { battleArea: [{ card: "BT23-016", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marine = s.inst("marine");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(marine.instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(marine.instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("returns exactly one opposing Digimon tied for the lowest level on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-025", as: "marine" }] },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lowest" },
            { card: "BT23-017", as: "tied" },
            { card: "BT23-018", as: "higher" },
            { card: "BT23-019", as: "fourth" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("lowest").instanceId));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("higher").instanceId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("tied").instanceId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("fourth").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.hand.filter((card) => card.instanceId === s.inst("lowest").instanceId)).toHaveLength(1);
  });

  it("applies Security Attack -1 to exactly three opposing Digimon and excludes its own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-017", as: "cs" },
            { card: "BT23-018", as: "own" },
          ],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
          deck: Array(30).fill("BT1-011"),
        },
        1: {
          battleArea: [
            { card: "BT23-016", as: "opponentA" },
            { card: "BT23-017", as: "opponentB" },
            { card: "BT23-018", as: "opponentC" },
            { card: "BT23-019", as: "opponentD" },
          ],
          deck: Array(30).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("marine").instanceId,
        effectKey: handMainEffectKey(s, s.inst("marine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("marine").instanceId));
    for (const id of ["opponentA", "opponentB", "opponentC"] as const) {
      expect(observe(s.engine).keywordAmount(s.perm(id), "SecurityAttack")).toBe(-1);
    }
    expect(observe(s.engine).keywordAmount(s.perm("opponentD"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("own"), "SecurityAttack")).toBe(0);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const beforeSecurity = s.state.players[0]!.security.length;
    expect(observe(s.engine).keywordAmount(s.perm("opponentA"), "SecurityAttack")).toBe(-1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(beforeSecurity);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponentA"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly plays from Security after an opponent attack and deletes only that played Digimon at turn end, per Q5563-Q5564", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-025", as: "marine" }],
        battleArea: [{ card: "BT23-025", as: "untouched" }],
        hand: [{ card: "ST1-02", as: "spareOwn" }],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "attacker" },
          { card: "BT23-018", as: "other" },
        ],
        hand: [{ card: "ST1-02", as: "spareOpponent" }],
        deck: Array(10).fill("BT1-010"),
      },
    });
    const marineId = s.inst("marine").instanceId;
    await s.ready();
    // Reach the opponent's turn through the real turn loop, not a `turnSeat` write.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const attackerId = s.inst("attacker").instanceId;
    const otherId = s.inst("other").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    // It is still present before the opponent's turn ends.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId)).toBe(true);
    // The 11,000-DP Security Marine wins the battle: Monodramon is trashed.
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === attackerId)).toHaveLength(1);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(otherId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    // Q5563/Q5564 require deletion at the current turn end (the opponent's turn).
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("untouched").instanceId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(marineId);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === marineId)).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
